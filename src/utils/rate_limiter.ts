import { config } from "../config/index.ts";
import { withClient } from "../db/pool.ts";

export interface RateLimiter {
  consume(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

class InMemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, { expiresAt: number; count: number }>();

  async consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const record = this.store.get(key);
    if (record && record.expiresAt > now) {
      if (record.count >= limit) {
        return false;
      }
      record.count += 1;
      return true;
    }
    this.store.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return true;
  }
}

class PostgresRateLimiter implements RateLimiter {
  async consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);
    return await withClient(async (client) => {
      await client.queryObject`DELETE FROM rate_limits WHERE key = ${key} AND window_start < ${windowStart}`;
      const result = await client.queryObject<{ count: number }>`
        INSERT INTO rate_limits (key, window_start, count)
        VALUES (${key}, ${now}, 1)
        ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1, window_start = ${now}
        RETURNING count;
      `;
      const count = result.rows[0]?.count ?? 0;
      return count <= limit;
    });
  }
}

let instance: RateLimiter;

export const getRateLimiter = (): RateLimiter => {
  if (!instance) {
    instance = config.appEnv === "production" ? new PostgresRateLimiter() : new InMemoryRateLimiter();
  }
  return instance;
};

export const resetRateLimiter = () => {
  instance = config.appEnv === "production" ? new PostgresRateLimiter() : new InMemoryRateLimiter();
};
