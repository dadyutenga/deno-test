import { config as loadDotEnv } from "dotenv";
import { z } from "zod";
import { configSchema, type AppConfig } from "./schema.ts";

const rawEnv = await loadDotEnv({ export: true, allowEmptyValues: true });

const numberTransform = (value?: string) => (value ? Number(value) : undefined);

const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).optional(),
  APP_PORT: z.string().optional(),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  ACCESS_TOKEN_TTL_MINUTES: z.string().optional(),
  REFRESH_TOKEN_TTL_DAYS: z.string().optional(),
  OTP_TTL_MINUTES: z.string().optional(),
  OTP_ATTEMPT_LIMIT: z.string().optional(),
  OTP_SEND_WINDOW_SECONDS: z.string().optional(),
  OTP_SEND_MAX: z.string().optional(),
  RATE_LIMIT_WINDOW_SECONDS: z.string().optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
});

const parsed = envSchema.safeParse({
  APP_ENV: Deno.env.get("APP_ENV") ?? rawEnv.APP_ENV,
  APP_PORT: Deno.env.get("APP_PORT") ?? rawEnv.APP_PORT ?? "8000",
  DATABASE_URL: Deno.env.get("DATABASE_URL") ?? rawEnv.DATABASE_URL,
  JWT_SECRET: Deno.env.get("JWT_SECRET") ?? rawEnv.JWT_SECRET,
  ACCESS_TOKEN_TTL_MINUTES: Deno.env.get("ACCESS_TOKEN_TTL_MINUTES") ?? rawEnv.ACCESS_TOKEN_TTL_MINUTES,
  REFRESH_TOKEN_TTL_DAYS: Deno.env.get("REFRESH_TOKEN_TTL_DAYS") ?? rawEnv.REFRESH_TOKEN_TTL_DAYS,
  OTP_TTL_MINUTES: Deno.env.get("OTP_TTL_MINUTES") ?? rawEnv.OTP_TTL_MINUTES,
  OTP_ATTEMPT_LIMIT: Deno.env.get("OTP_ATTEMPT_LIMIT") ?? rawEnv.OTP_ATTEMPT_LIMIT,
  OTP_SEND_WINDOW_SECONDS: Deno.env.get("OTP_SEND_WINDOW_SECONDS") ?? rawEnv.OTP_SEND_WINDOW_SECONDS,
  OTP_SEND_MAX: Deno.env.get("OTP_SEND_MAX") ?? rawEnv.OTP_SEND_MAX,
  RATE_LIMIT_WINDOW_SECONDS: Deno.env.get("RATE_LIMIT_WINDOW_SECONDS") ?? rawEnv.RATE_LIMIT_WINDOW_SECONDS,
  RATE_LIMIT_MAX_REQUESTS: Deno.env.get("RATE_LIMIT_MAX_REQUESTS") ?? rawEnv.RATE_LIMIT_MAX_REQUESTS,
});

if (!parsed.success) {
  console.error(parsed.error.format());
  throw new Error("Invalid environment configuration");
}

const normalizedConfig = configSchema.parse({
  appEnv: parsed.data.APP_ENV ?? "development",
  appPort: numberTransform(parsed.data.APP_PORT) ?? 8000,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  accessTokenTtlMinutes: numberTransform(parsed.data.ACCESS_TOKEN_TTL_MINUTES),
  refreshTokenTtlDays: numberTransform(parsed.data.REFRESH_TOKEN_TTL_DAYS),
  otpTtlMinutes: numberTransform(parsed.data.OTP_TTL_MINUTES),
  otpAttemptLimit: numberTransform(parsed.data.OTP_ATTEMPT_LIMIT),
  otpSendWindowSeconds: numberTransform(parsed.data.OTP_SEND_WINDOW_SECONDS),
  otpSendMax: numberTransform(parsed.data.OTP_SEND_MAX),
  rateLimitWindowSeconds: numberTransform(parsed.data.RATE_LIMIT_WINDOW_SECONDS),
  rateLimitMaxRequests: numberTransform(parsed.data.RATE_LIMIT_MAX_REQUESTS),
});

export const config: AppConfig = normalizedConfig;
