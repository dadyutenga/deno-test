import pool from "../db/client.ts";
import { hash, compare } from "../deps.ts";
import { SmtpClient } from "../deps.ts";
import { SMTP } from "../config/env.ts";
import type { User } from "../models/user.model.ts";
import type { OTP } from "../models/otp.model.ts";

const smtpClient = new SmtpClient({
  hostname: SMTP.host,
  port: SMTP.port,
  username: SMTP.username,
  password: SMTP.password,
});

export const register = async (
  email: string,
  password: string,
  name: string,
): Promise<void> => {
  const passwordHash = await hash(password);
  const client = await pool.connect();
  try {
    await client.queryObject(
      `INSERT INTO users (email, password_hash, name, is_verified) VALUES ($1, $2, $3, false)`,
      [email, passwordHash, name],
    );
    await sendOTP(email);
  } finally {
    client.release();
  }
};

export const login = async (
  email: string,
  password: string,
): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const result = await client.queryObject<User>(
      "SELECT id, email, name, password_hash, is_verified, created_at FROM users WHERE email = $1",
      [email],
    );
    const user = result.rows[0];
    if (!user || !(await compare(password, user.password_hash))) {
      return null;
    }
    if (!user.is_verified) {
      throw new Error("Account not verified");
    }
    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } finally {
    client.release();
  }
};

export const sendOTP = async (email: string): Promise<void> => {
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const client = await pool.connect();
  try {
    // Delete any existing OTP for this email
    await client.queryObject("DELETE FROM otps WHERE email = $1", [email]);
    // Insert new OTP
    await client.queryObject(
      "INSERT INTO otps (email, otp_code, expires_at) VALUES ($1, $2, $3)",
      [email, otpCode, expiresAt],
    );
    // Send email
    await smtpClient.connect();
    await smtpClient.send({
      from: SMTP.username,
      to: email,
      subject: "Your OTP Code",
      content: `Your OTP code is: ${otpCode}`,
    });
    await smtpClient.close();
  } finally {
    client.release();
  }
};

export const verifyOTP = async (
  email: string,
  otpCode: string,
): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const result = await client.queryObject<OTP>(
      "SELECT id, email, otp_code, expires_at FROM otps WHERE email = $1 AND otp_code = $2 AND expires_at > NOW()",
      [email, otpCode],
    );
    if (result.rows.length === 0) {
      return false;
    }
    // Delete the OTP
    await client.queryObject("DELETE FROM otps WHERE id = $1", [
      result.rows[0].id,
    ]);
    // Set user as verified
    await client.queryObject(
      "UPDATE users SET is_verified = true WHERE email = $1",
      [email],
    );
    return true;
  } finally {
    client.release();
  }
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
