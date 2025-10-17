import { config } from "../deps.ts";

const env = await config({ safe: false });

export const DB = {
  user: env.PGUSER ?? "postgres",
  password: env.PGPASSWORD ?? "postgres",
  database: env.PGDATABASE ?? "deno_db",
  hostname: env.PGHOST ?? "localhost",
  port: Number(env.PGPORT ?? 5432),
};

export const PORT = Number(env.PORT ?? 8000);
