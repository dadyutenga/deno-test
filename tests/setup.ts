Deno.env.set("APP_ENV", "test");
Deno.env.set("DATABASE_URL", Deno.env.get("TEST_DATABASE_URL") ?? "postgres://postgres:postgres@localhost:5432/deno_auth_test");
Deno.env.set("JWT_SECRET", Deno.env.get("JWT_SECRET") ?? "testsecretkeytestsecretkey");

const { config } = await import("../src/config/index.ts");
const { withClient } = await import("../src/db/pool.ts");

export const setupDatabase = async () => {
  await withClient(async (client) => {
    await client.queryArray`CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text NOT NULL,
      is_verified boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`;

    await client.queryArray`CREATE TABLE IF NOT EXISTS otp_codes (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash text NOT NULL,
      type text NOT NULL,
      expires_at timestamptz NOT NULL,
      attempts integer DEFAULT 0,
      max_attempts integer NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz DEFAULT now()
    );`;

    await client.queryArray`CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz DEFAULT now()
    );`;

    await client.queryArray`CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY,
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      event_type text NOT NULL,
      metadata jsonb,
      ip_address text,
      user_agent text,
      created_at timestamptz DEFAULT now()
    );`;

    await client.queryArray`CREATE TABLE IF NOT EXISTS rate_limits (
      key text PRIMARY KEY,
      window_start timestamptz NOT NULL,
      count integer NOT NULL
    );`;
  });
};

export const resetDatabase = async () => {
  await withClient(async (client) => {
    await client.queryArray`TRUNCATE TABLE audit_logs, sessions, otp_codes, users, rate_limits RESTART IDENTITY CASCADE`;
  });
};

export { config };
