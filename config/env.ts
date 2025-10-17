import { config } from "../deps.ts";

const env = await config({ safe: false });

export const DB = {
  user: env.PGUSER ?? "postgres",
  password: env.PGPASSWORD ?? "123456789",
  database: env.PGDATABASE ?? "deno_db",
  hostname: env.PGHOST ?? "localhost",
  port: Number(env.PGPORT ?? 5432),
};

export const PORT = Number(env.PORT ?? 8000);

export const SMTP = {
  host: env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(env.SMTP_PORT ?? 587),
  username: env.SMTP_USER ?? "testorder1245@gmail.com",
  password: env.SMTP_PASS ?? "piik ctai zlyk owfm",
};
