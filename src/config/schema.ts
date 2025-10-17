import { z } from "zod";

export const configSchema = z.object({
  appEnv: z.enum(["development", "test", "production"]).default("development"),
  appPort: z.number().int().positive().default(8000),
  databaseUrl: z.string().url(),
  jwtSecret: z.string().min(16),
  accessTokenTtlMinutes: z.number().int().positive().default(15),
  refreshTokenTtlDays: z.number().int().positive().default(7),
  otpTtlMinutes: z.number().int().positive().default(10),
  otpAttemptLimit: z.number().int().positive().default(5),
  otpSendWindowSeconds: z.number().int().positive().default(60),
  otpSendMax: z.number().int().positive().default(3),
  rateLimitWindowSeconds: z.number().int().positive().default(60),
  rateLimitMaxRequests: z.number().int().positive().default(30),
});

export type AppConfig = z.infer<typeof configSchema>;
