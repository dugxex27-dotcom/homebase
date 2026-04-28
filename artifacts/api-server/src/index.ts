import { type Request, type Response } from "express";
import app from "./app";
import { registerRoutes } from "./routes/routes";
import { logger } from "./lib/logger";
import { runMigrations } from "./migrate";
import { seedRegionalData } from "./seed-regional-data";
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

  const server = await registerRoutes(app);

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
