import { z } from "zod";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);
const nameSchema = z.string().min(1).max(255);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const registerResponseSchema = z.object({
  userId: z.string().uuid(),
  message: z.string(),
});

export const verifyOtpRequestSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  type: z.enum(["register", "password_reset"]).default("register"),
});

export const sendOtpRequestSchema = z.object({
  email: emailSchema,
  type: z.enum(["register", "password_reset"]).default("register"),
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string(),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  newPassword: passwordSchema,
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;
export type SendOtpRequest = z.infer<typeof sendOtpRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmRequest = z.infer<typeof passwordResetConfirmSchema>;
