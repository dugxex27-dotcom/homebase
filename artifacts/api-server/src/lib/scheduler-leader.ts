import { randomUUID } from 'crypto';
import { pool } from '../db';
import { logger } from './logger';

const LEASE_TTL_MS = 60_000;
const RENEW_INTERVAL_MS = 20_000;
const INSTANCE_ID = randomUUID();

const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS scheduler_leader (
    id          INTEGER     PRIMARY KEY DEFAULT 1,
    instance_id TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL
  );
`;

let renewInterval: NodeJS.Timeout | null = null;
let isLeader = false;

async function tryClaimLease(): Promise<boolean> {
  const expiresAt = new Date(Date.now() + LEASE_TTL_MS);
  const result = await pool.query<{ instance_id: string }>(
    `INSERT INTO scheduler_leader (id, instance_id, expires_at)
     VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE
       SET instance_id = $1,
           expires_at  = $2
       WHERE scheduler_leader.expires_at < NOW()
     RETURNING instance_id`,
    [INSTANCE_ID, expiresAt],
  );
  return result.rows.length > 0 && result.rows[0].instance_id === INSTANCE_ID;
}

async function renewLease(): Promise<boolean> {
  const expiresAt = new Date(Date.now() + LEASE_TTL_MS);
  const result = await pool.query<{ instance_id: string }>(
    `UPDATE scheduler_leader
     SET expires_at = $2
     WHERE id = 1 AND instance_id = $1
     RETURNING instance_id`,
    [INSTANCE_ID, expiresAt],
  );
  return result.rows.length > 0;
}

async function releaseLease(): Promise<void> {
  await pool.query(
    `DELETE FROM scheduler_leader WHERE id = 1 AND instance_id = $1`,
    [INSTANCE_ID],
  );
}

export async function initLeaderLease(
  onBecomeLeader: () => void,
  onLoseLeadership: () => void,
): Promise<void> {
  try {
    await pool.query(INIT_SQL);
  } catch (err) {
    logger.warn({ err }, '[SchedulerLeader] Table init failed, schedulers will not start');
    return;
  }

  try {
    isLeader = await tryClaimLease();
  } catch (err) {
    logger.warn({ err }, '[SchedulerLeader] Failed to claim lease on startup');
    isLeader = false;
  }

  if (isLeader) {
    logger.info({ instanceId: INSTANCE_ID }, '[SchedulerLeader] This instance is the scheduler leader');
    onBecomeLeader();
  } else {
    logger.info({ instanceId: INSTANCE_ID }, '[SchedulerLeader] Another instance holds the lease — schedulers skipped');
  }

  renewInterval = setInterval(async () => {
    try {
      if (isLeader) {
        const renewed = await renewLease();
        if (!renewed) {
          logger.warn({ instanceId: INSTANCE_ID }, '[SchedulerLeader] Lost scheduler leadership — stopping schedulers');
          isLeader = false;
          onLoseLeadership();
        }
      } else {
        const claimed = await tryClaimLease();
        if (claimed) {
          logger.info({ instanceId: INSTANCE_ID }, '[SchedulerLeader] Claimed scheduler leadership — starting schedulers');
          isLeader = true;
          onBecomeLeader();
        }
      }
    } catch (err) {
      logger.warn({ err }, '[SchedulerLeader] Lease renewal check failed');
    }
  }, RENEW_INTERVAL_MS);

  renewInterval.unref();
}

export async function releaseLeaderLease(): Promise<void> {
  if (renewInterval) {
    clearInterval(renewInterval);
    renewInterval = null;
  }
  if (isLeader) {
    try {
      await releaseLease();
      logger.info({ instanceId: INSTANCE_ID }, '[SchedulerLeader] Released scheduler leadership on shutdown');
    } catch (err) {
      logger.warn({ err }, '[SchedulerLeader] Failed to release leadership on shutdown');
    }
    isLeader = false;
  }
}
