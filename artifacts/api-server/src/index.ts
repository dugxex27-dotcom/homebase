import { type Request, type Response } from "express";
import app from "./app";
import { registerRoutes } from "./routes/routes";
import { logger } from "./lib/logger";
import { runMigrations } from "./migrate";
import { seedRegionalData } from "./seed-regional-data";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { trialReminderScheduler } from "./trial-reminder-scheduler";
import { profileViewReportScheduler } from "./profile-view-report-scheduler";
import { weeklyTaskReminderScheduler } from "./weekly-task-reminder-scheduler";
import { expiredTrialReengagementScheduler } from "./expired-trial-reengagement-scheduler";
import { referralReminderScheduler } from "./referral-reminder-scheduler";
import { weatherAlertScheduler } from "./weather-alert-scheduler";
import { weatherForecastReminderScheduler } from "./weather-forecast-reminder-scheduler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Proxy /info (and any /info/* sub-paths) to SquareSpace while keeping
// gotohomebase.com/info as the visible URL in the browser.
const squarespaceBase = "https://gotohomebase.squarespace.com";

function rewriteHtml(html: string): string {
  html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${squarespaceBase}/">`);
  html = html.replace(/(href|src|action)="(\/(?!\/))/gi, `$1="${squarespaceBase}/`);
  html = html.replace(/(href|src|action)='(\/(?!\/))/gi, `$1='${squarespaceBase}/`);
  html = html.replace(/url\("(\/(?!\/))/gi, `url("${squarespaceBase}/`);
  html = html.replace(/url\('(\/(?!\/))/gi, `url('${squarespaceBase}/`);
  html = html.replace(/url\((\/(?!\/))/gi, `url(${squarespaceBase}/`);
  return html;
}

async function proxyToSquarespace(req: Request, res: Response) {
  const targetUrl = `${squarespaceBase}${req.originalUrl}`;
  console.log(`[INFO-PROXY] Forwarding ${req.method} ${req.originalUrl} -> ${targetUrl}`);
  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Accept": req.headers["accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.5",
        "Accept-Encoding": "identity",
        "Host": "gotohomebase.squarespace.com",
      },
      redirect: "follow",
    });

    res.status(upstream.status);
    const skipHeaders = new Set([
      "content-encoding", "transfer-encoding",
      "x-frame-options", "content-security-policy",
      "x-content-security-policy", "strict-transport-security",
      "connection", "keep-alive",
    ]);
    upstream.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.setHeader(
      "content-security-policy",
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
    );

    const contentType = upstream.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const text = await upstream.text();
      const rewritten = rewriteHtml(text);
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(rewritten);
    } else {
      const body = await upstream.arrayBuffer();
      res.end(Buffer.from(body));
    }
  } catch (err) {
    console.error("[INFO-PROXY] Error:", err);
    res.status(502).send("Bad gateway – could not reach SquareSpace.");
  }
}

app.get("/info", proxyToSquarespace);
app.get("/info/*path", proxyToSquarespace);

(async () => {
  await runMigrations();
  try {
    await seedRegionalData();
  } catch (err) {
    logger.warn({ err }, "[seed-regional-data] Seeding failed — server will still start");
  }

  // Emit an operator-visible notice about the MemStorage → DB transition for
  // contractor boosts.  Any boosts created before this code change were stored
  // only in the process-local MemStorage Map and are irrecoverable after a
  // restart.  This log makes the potential loss explicit and documents the
  // recovery path via the admin reconciliation endpoint.
  try {
    await storage.notifyLegacyBoostDataRisk();
  } catch (err) {
    logger.warn({ err }, '[BoostMigration] Could not emit legacy boost transition notice — continuing');
  }

  // Safety-net startup flush: in rolling-deploy scenarios the in-memory
  // mirror may hold boosts created in this process since startup.  On a
  // clean restart the mirror is empty and this is a confirmed no-op.
  try {
    const startupResult = await storage.migrateMemStorageBoosts();
    if (startupResult.migrated > 0) {
      logger.info(startupResult, '[BoostMigration] Startup flush persisted in-memory boosts to DB.');
    }
  } catch (err) {
    logger.warn({ err }, '[BoostMigration] Startup flush failed — continuing without it');
  }

  // Startup flush: migrate any in-memory contractor reviews, company invite
  // codes, and push subscriptions to the database.  On a clean restart the
  // MemStorage maps are empty, so these are confirmed no-ops.  In rolling-
  // deploy or legacy-path scenarios they provide a safety net.
  try {
    const reviewResult = await storage.migrateMemStorageReviews();
    if (reviewResult.migrated > 0) {
      logger.info(reviewResult, '[ReviewMigration] Startup flush persisted in-memory reviews to DB.');
    }
  } catch (err) {
    logger.warn({ err }, '[ReviewMigration] Startup flush failed — continuing without it');
  }

  try {
    const inviteResult = await storage.migrateMemStorageInviteCodes();
    if (inviteResult.migrated > 0) {
      logger.info(inviteResult, '[InviteCodeMigration] Startup flush persisted in-memory invite codes to DB.');
    }
  } catch (err) {
    logger.warn({ err }, '[InviteCodeMigration] Startup flush failed — continuing without it');
  }

  try {
    const subResult = await storage.migrateMemStoragePushSubscriptions();
    if (subResult.migrated > 0) {
      logger.info(subResult, '[SubMigration] Startup flush persisted in-memory push subscriptions to DB.');
    }
  } catch (err) {
    logger.warn({ err }, '[SubMigration] Startup flush failed — continuing without it');
  }

  // ONE-TIME: Delete old Apple review test accounts (replaced by homeowner1/contractor1).
  // Remove this block after next successful deployment.
  try {
    const oldEmails = ['homeownertest@codestationai.com', 'contractortest@codestationai.com'];
    for (const email of oldEmails) {
      const u = await storage.getUserByEmail(email);
      if (u) {
        await db.delete(users).where(eq(users.id, u.id));
        logger.info({ email }, '[TestCleanup] Deleted old review test account');
      }
    }
  } catch (err) {
    logger.warn({ err }, '[TestCleanup] Could not delete old test accounts — continuing');
  }

  const server = await registerRoutes(app);

  // Graceful shutdown — flush any in-memory boosts to the database before
  // the process exits, then close the HTTP server cleanly.
  // DbStorage.createContractorBoost() dual-writes to both DB and the
  // MemStorage mirror; this flush is therefore idempotent for new boosts
  // but critical for any boost that only made it into the mirror (legacy
  // MemStorage code path).
  let shuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — flushing in-memory data before shutdown...`);

    try {
      const { migrated, skipped } = await storage.migrateMemStorageBoosts();
      logger.info({ migrated, skipped }, '[BoostMigration] Pre-shutdown flush complete.');
    } catch (err) {
      logger.error(
        { err },
        '[BoostMigration] Pre-shutdown flush FAILED — some in-memory boost data may not have been persisted. ' +
        'Use POST /api/admin/contractor-boosts/recover to re-import any missing records.',
      );
    }

    try {
      const { migrated, skipped } = await storage.migrateMemStorageReviews();
      logger.info({ migrated, skipped }, '[ReviewMigration] Pre-shutdown flush complete.');
    } catch (err) {
      logger.error({ err }, '[ReviewMigration] Pre-shutdown flush FAILED — some in-memory review data may not have been persisted.');
    }

    try {
      const { migrated, skipped } = await storage.migrateMemStorageInviteCodes();
      logger.info({ migrated, skipped }, '[InviteCodeMigration] Pre-shutdown flush complete.');
    } catch (err) {
      logger.error({ err }, '[InviteCodeMigration] Pre-shutdown flush FAILED — some in-memory invite code data may not have been persisted.');
    }

    try {
      const { migrated, skipped } = await storage.migrateMemStoragePushSubscriptions();
      logger.info({ migrated, skipped }, '[SubMigration] Pre-shutdown flush complete.');
    } catch (err) {
      logger.error({ err }, '[SubMigration] Pre-shutdown flush FAILED — some in-memory push subscription data may not have been persisted.');
    }

    server.close(() => {
      logger.info('HTTP server closed. Exiting.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  server.listen(port, () => {
    logger.info({ port }, "Server listening");

    trialReminderScheduler.start();
    profileViewReportScheduler.start();
    weeklyTaskReminderScheduler.start();
    expiredTrialReengagementScheduler.start();
    referralReminderScheduler.start();
    weatherAlertScheduler.start();
    weatherForecastReminderScheduler.start();
  });

  server.on("error", (err) => {
    logger.error({ err }, "Server error");
    process.exit(1);
  });
})().catch((err) => {
  logger.error({ err }, "Failed to initialize server");
  process.exit(1);
});
