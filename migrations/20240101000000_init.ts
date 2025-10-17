import { Migration } from "https://deno.land/x/nessie@2.0.10/mod.ts";

export default class InitMigration extends Migration {
  async up(): Promise<void> {
    await this.client.queryArray`CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text NOT NULL,
      is_verified boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`;

    await this.client.queryArray`CREATE TABLE IF NOT EXISTS otp_codes (
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

    await this.client.queryArray`CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz DEFAULT now()
    );`;

    await this.client.queryArray`CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY,
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      event_type text NOT NULL,
      metadata jsonb,
      ip_address text,
      user_agent text,
      created_at timestamptz DEFAULT now()
    );`;

    await this.client.queryArray`CREATE TABLE IF NOT EXISTS rate_limits (
      key text PRIMARY KEY,
      window_start timestamptz NOT NULL,
      count integer NOT NULL
    );`;
  }

  async down(): Promise<void> {
    await this.client.queryArray`DROP TABLE IF EXISTS rate_limits;`;
    await this.client.queryArray`DROP TABLE IF EXISTS audit_logs;`;
    await this.client.queryArray`DROP TABLE IF EXISTS sessions;`;
    await this.client.queryArray`DROP TABLE IF EXISTS otp_codes;`;
    await this.client.queryArray`DROP TABLE IF EXISTS users;`;
  }
}
