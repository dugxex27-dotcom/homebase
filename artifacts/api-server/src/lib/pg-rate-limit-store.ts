import { pool } from '../db';
import { logger } from './logger';

const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS express_rate_limits (
    key       TEXT        NOT NULL,
    hits      INTEGER     NOT NULL DEFAULT 1,
    reset_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (key, reset_at)
  );
  CREATE INDEX IF NOT EXISTS idx_erl_reset_at ON express_rate_limits (reset_at);
`;

pool.query(INIT_SQL).catch((err) => {
  logger.error({ err }, '[PgRateLimitStore] table init failed');
});

export class PgRateLimitStore {
  private windowMs = 60_000;
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
  }

  private resetTime(): Date {
    const now = Date.now();
    return new Date(Math.ceil(now / this.windowMs) * this.windowMs);
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const fullKey = `${this.prefix}:${key}`;
    const resetTime = this.resetTime();
    try {
      const result = await pool.query<{ hits: string }>(
        `INSERT INTO express_rate_limits (key, hits, reset_at)
         VALUES ($1, 1, $2)
         ON CONFLICT (key, reset_at)
         DO UPDATE SET hits = express_rate_limits.hits + 1
         RETURNING hits`,
        [fullKey, resetTime],
      );
      if (Math.random() < 0.01) {
        pool.query('DELETE FROM express_rate_limits WHERE reset_at < NOW()').catch(() => {});
      }
      return { totalHits: Number(result.rows[0]?.hits ?? 1), resetTime };
    } catch (err) {
      logger.warn({ err, prefix: this.prefix }, '[PgRateLimitStore] increment failed, failing open');
      return { totalHits: 1, resetTime };
    }
  }

  async decrement(key: string): Promise<void> {
    const fullKey = `${this.prefix}:${key}`;
    const resetTime = this.resetTime();
    try {
      await pool.query(
        `UPDATE express_rate_limits
         SET hits = GREATEST(hits - 1, 0)
         WHERE key = $1 AND reset_at = $2`,
        [fullKey, resetTime],
      );
    } catch (err) {
      logger.warn({ err, prefix: this.prefix }, '[PgRateLimitStore] decrement failed');
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await pool.query('DELETE FROM express_rate_limits WHERE key = $1', [
        `${this.prefix}:${key}`,
      ]);
    } catch (err) {
      logger.warn({ err, prefix: this.prefix }, '[PgRateLimitStore] resetKey failed');
    }
  }

  async resetAll(): Promise<void> {
    try {
      await pool.query('DELETE FROM express_rate_limits WHERE key LIKE $1', [
        `${this.prefix}:%`,
      ]);
    } catch (err) {
      logger.warn({ err, prefix: this.prefix }, '[PgRateLimitStore] resetAll failed');
    }
  }
}
