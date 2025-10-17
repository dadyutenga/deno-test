import type { PoolClient } from "postgres";
import { config } from "../../config/index.ts";
import { emailAdapter } from "../../adapters/messaging.ts";
import { withClient } from "../../db/pool.ts";
import { addDays, addMinutes, now } from "../../utils/date.ts";
import { error } from "../../utils/error.ts";
import { getRateLimiter } from "../../utils/rate_limiter.ts";
import { hash, verifyHash } from "../../utils/hash.ts";
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
} from "./jwt.ts";
import type {
  LoginRequest,
  LoginResponse,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
  SendOtpRequest,
  VerifyOtpRequest,
} from "./schemas.ts";

interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  is_verified: boolean;
}

interface OtpRecord {
  id: string;
  user_id: string;
  code_hash: string;
  type: string;
  expires_at: Date;
  attempts: number;
  max_attempts: number;
  consumed_at: Date | null;
}

interface SessionRecord {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const createAuditLog = async (
  client: PoolClient,
  userId: string | null,
  event: string,
  metadata: Record<string, unknown>,
  context: { ip?: string; userAgent?: string } = {},
) => {
  await client.queryArray`
    INSERT INTO audit_logs (id, user_id, event_type, metadata, ip_address, user_agent)
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${event},
      ${JSON.stringify(metadata)}::jsonb,
      ${context.ip ?? null},
      ${context.userAgent ?? null}
    )
  `;
};

const createOtp = async (
  client: PoolClient,
  userId: string,
  type: string,
): Promise<{ otpId: string; code: string }> => {
  await client.queryArray`DELETE FROM otp_codes WHERE user_id = ${userId} AND type = ${type}`;
  const otpId = crypto.randomUUID();
  const code = generateOtp();
  const hashed = await hash(code);
  const expiresAt = addMinutes(now(), config.otpTtlMinutes);
  await client.queryArray`
    INSERT INTO otp_codes (id, user_id, code_hash, type, expires_at, max_attempts)
    VALUES (${otpId}, ${userId}, ${hashed}, ${type}, ${expiresAt}, ${config.otpAttemptLimit})
  `;
  return { otpId, code };
};

const getActiveOtp = async (client: PoolClient, userId: string, type: string): Promise<OtpRecord | null> => {
  const result = await client.queryObject<
    OtpRecord & { expires_at: string; consumed_at: string | null }
  >`
    SELECT id, user_id, code_hash, type, expires_at, attempts, max_attempts, consumed_at
    FROM otp_codes
    WHERE user_id = ${userId} AND type = ${type} AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const row = result.rows.at(0);
  if (!row) {
    return null;
  }
  return {
    ...row,
    expires_at: new Date(row.expires_at),
    consumed_at: row.consumed_at ? new Date(row.consumed_at) : null,
  };
};

const consumeOtp = async (client: PoolClient, otpId: string) => {
  await client.queryArray`UPDATE otp_codes SET consumed_at = ${now()} WHERE id = ${otpId}`;
};

const incrementOtpAttempt = async (client: PoolClient, otpId: string): Promise<number> => {
  const result = await client.queryObject<{ attempts: number }>`
    UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ${otpId} RETURNING attempts
  `;
  return result.rows.at(0)?.attempts ?? 0;
};

const sendOtpMessage = async (email: string, code: string, type: string) => {
  await emailAdapter.send({
    to: email,
    subject: `Your ${type.replace("_", " ")} code`,
    body: `Your verification code is: ${code}`,
  });
};

const createSession = async (client: PoolClient, userId: string, refreshToken: string): Promise<string> => {
  const sessionId = crypto.randomUUID();
  const refreshHash = await hash(refreshToken);
  const expiresAt = addDays(now(), config.refreshTokenTtlDays);
  await client.queryArray`
    INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
    VALUES (${sessionId}, ${userId}, ${refreshHash}, ${expiresAt})
  `;
  return sessionId;
};

const revokeSession = async (client: PoolClient, sessionId: string) => {
  await client.queryArray`UPDATE sessions SET revoked_at = ${now()} WHERE id = ${sessionId}`;
};

const findUserByEmail = async (client: PoolClient, email: string): Promise<UserRecord | null> => {
  const result = await client.queryObject<UserRecord>`
    SELECT id, email, password_hash, name, is_verified
    FROM users
    WHERE email = ${email}
  `;
  return result.rows.at(0) ?? null;
};

const findActiveSessions = async (client: PoolClient, userId: string): Promise<SessionRecord[]> => {
  const result = await client.queryObject<SessionRecord>`
    SELECT id, user_id, refresh_token_hash, expires_at, revoked_at
    FROM sessions
    WHERE user_id = ${userId} AND revoked_at IS NULL AND expires_at > ${now()}
  `;
  return result.rows;
};

const updatePassword = async (client: PoolClient, userId: string, newPassword: string) => {
  const hashed = await hash(newPassword);
  await client.queryArray`UPDATE users SET password_hash = ${hashed}, updated_at = ${now()} WHERE id = ${userId}`;
};

const markUserVerified = async (client: PoolClient, userId: string) => {
  await client.queryArray`UPDATE users SET is_verified = true, updated_at = ${now()} WHERE id = ${userId}`;
};

const createUser = async (client: PoolClient, payload: RegisterRequest): Promise<string> => {
  const userId = crypto.randomUUID();
  const passwordHash = await hash(payload.password);
  await client.queryArray`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${userId}, ${payload.email}, ${passwordHash}, ${payload.name})
  `;
  return userId;
};

const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  return await withClient(async (client) => {
    await client.queryArray`BEGIN`;
    try {
      const result = await fn(client);
      await client.queryArray`COMMIT`;
      return result;
    } catch (err) {
      await client.queryArray`ROLLBACK`;
      throw err;
    }
  });
};

export class AuthService {
  async register(payload: RegisterRequest, context: { ip?: string; userAgent?: string }) {
    return await withTransaction(async (client) => {
      const existingUser = await findUserByEmail(client, payload.email);
      if (existingUser) {
        throw error("USER_EXISTS", "User already exists");
      }
      const userId = await createUser(client, payload);
      const { code } = await createOtp(client, userId, "register");
      await createAuditLog(client, userId, "auth.register", { email: payload.email }, context);
      await sendOtpMessage(payload.email, code, "register");
      const response: Record<string, unknown> = {
        userId,
        message: "Registration successful. OTP sent.",
      };
      if (config.appEnv === "test") {
        response.otp = code;
      }
      return response;
    });
  }

  async sendOtp(payload: SendOtpRequest, context: { ip?: string }) {
    const limiter = getRateLimiter();
    const allowed = await limiter.consume(`otp:${payload.type}:${payload.email}`, config.otpSendMax, config.otpSendWindowSeconds);
    if (!allowed) {
      throw error("RATE_LIMITED", "OTP request limit reached");
    }
    return await withTransaction(async (client) => {
      const user = await findUserByEmail(client, payload.email);
      if (!user) {
        throw error("USER_NOT_FOUND", "User not found");
      }
      const { code } = await createOtp(client, user.id, payload.type);
      await createAuditLog(client, user.id, "auth.send_otp", { type: payload.type }, context);
      await sendOtpMessage(payload.email, code, payload.type);
      const response: Record<string, unknown> = { message: "OTP sent" };
      if (config.appEnv === "test") {
        response.otp = code;
      }
      return response;
    });
  }

  async verifyOtp(payload: VerifyOtpRequest, context: { ip?: string }) {
    return await withTransaction(async (client) => {
      const user = await findUserByEmail(client, payload.email);
      if (!user) {
        throw error("USER_NOT_FOUND", "User not found");
      }
      const otp = await getActiveOtp(client, user.id, payload.type);
      if (!otp) {
        throw error("OTP_INVALID", "OTP not found");
      }
      if (otp.expires_at < now()) {
        await consumeOtp(client, otp.id);
        throw error("OTP_EXPIRED", "OTP expired");
      }
      const valid = await verifyHash(payload.code, otp.code_hash);
      if (!valid) {
        const attempts = await incrementOtpAttempt(client, otp.id);
        if (attempts >= otp.max_attempts) {
          await consumeOtp(client, otp.id);
          throw error("OTP_ATTEMPTS_EXCEEDED", "OTP attempt limit reached");
        }
        throw error("OTP_INVALID", "Incorrect OTP");
      }
      await consumeOtp(client, otp.id);
      if (payload.type === "register" && !user.is_verified) {
        await markUserVerified(client, user.id);
      }
      if (payload.type === "password_reset") {
        await createAuditLog(client, user.id, "auth.password_reset_verified", {}, context);
      } else {
        await createAuditLog(client, user.id, "auth.otp_verified", { type: payload.type }, context);
      }
      return { message: "OTP verified", isVerified: payload.type === "register" ? true : undefined };
    });
  }

  async login(payload: LoginRequest, context: { ip?: string }) {
    return await withTransaction(async (client) => {
      const user = await findUserByEmail(client, payload.email);
      if (!user) {
        await createAuditLog(client, null, "auth.login_failed", { email: payload.email, reason: "not_found" }, context);
        throw error("INVALID_CREDENTIALS", "Invalid credentials");
      }
      const passwordValid = await verifyHash(payload.password, user.password_hash);
      if (!passwordValid) {
        await createAuditLog(client, user.id, "auth.login_failed", { reason: "invalid_password" }, context);
        throw error("INVALID_CREDENTIALS", "Invalid credentials");
      }
      if (!user.is_verified) {
        throw error("USER_NOT_VERIFIED", "User is not verified");
      }
      const accessToken = await createAccessToken(user.id);
      const refreshToken = await createRefreshToken(user.id);
      await createSession(client, user.id, refreshToken);
      await createAuditLog(client, user.id, "auth.login_success", {}, context);
      const response: LoginResponse & { refreshToken: string } = {
        accessToken,
        refreshToken,
        expiresIn: config.accessTokenTtlMinutes * 60,
      };
      return response;
    });
  }

  async refresh(payload: { refreshToken: string }) {
    return await withTransaction(async (client) => {
      const decoded = await verifyToken(payload.refreshToken).catch(() => null);
      if (!decoded || decoded.type !== "refresh") {
        throw error("SESSION_INVALID", "Invalid refresh token");
      }
      const sessions = await findActiveSessions(client, decoded.sub);
      let matchedSession: SessionRecord | null = null;
      for (const session of sessions) {
        if (await verifyHash(payload.refreshToken, session.refresh_token_hash)) {
          matchedSession = session;
          break;
        }
      }
      if (!matchedSession) {
        throw error("SESSION_INVALID", "Session not found");
      }
      await revokeSession(client, matchedSession.id);
      const accessToken = await createAccessToken(decoded.sub);
      const refreshToken = await createRefreshToken(decoded.sub);
      await createSession(client, decoded.sub, refreshToken);
      await createAuditLog(client, decoded.sub, "auth.refresh", {});
      return {
        accessToken,
        refreshToken,
        expiresIn: config.accessTokenTtlMinutes * 60,
      };
    });
  }

  async requestPasswordReset(payload: PasswordResetRequest, context: { ip?: string }) {
    return await withTransaction(async (client) => {
      const user = await findUserByEmail(client, payload.email);
      if (!user) {
        throw error("USER_NOT_FOUND", "User not found");
      }
      const { code } = await createOtp(client, user.id, "password_reset");
      await createAuditLog(client, user.id, "auth.password_reset_requested", {}, context);
      await sendOtpMessage(payload.email, code, "password_reset");
      const response: Record<string, unknown> = { message: "Password reset OTP sent" };
      if (config.appEnv === "test") {
        response.otp = code;
      }
      return response;
    });
  }

  async resetPassword(payload: PasswordResetConfirmRequest, context: { ip?: string }) {
    return await withTransaction(async (client) => {
      const user = await findUserByEmail(client, payload.email);
      if (!user) {
        throw error("USER_NOT_FOUND", "User not found");
      }
      const otp = await getActiveOtp(client, user.id, "password_reset");
      if (!otp) {
        throw error("OTP_INVALID", "OTP not found");
      }
      if (otp.expires_at < now()) {
        await consumeOtp(client, otp.id);
        throw error("OTP_EXPIRED", "OTP expired");
      }
      const valid = await verifyHash(payload.code, otp.code_hash);
      if (!valid) {
        const attempts = await incrementOtpAttempt(client, otp.id);
        if (attempts >= otp.max_attempts) {
          await consumeOtp(client, otp.id);
          throw error("OTP_ATTEMPTS_EXCEEDED", "OTP attempt limit reached");
        }
        throw error("OTP_INVALID", "Incorrect OTP");
      }
      await consumeOtp(client, otp.id);
      await updatePassword(client, user.id, payload.newPassword);
      const sessions = await findActiveSessions(client, user.id);
      for (const session of sessions) {
        await revokeSession(client, session.id);
      }
      await createAuditLog(client, user.id, "auth.password_reset_completed", {}, context);
      return { message: "Password updated" };
    });
  }
}

export const authService = new AuthService();
