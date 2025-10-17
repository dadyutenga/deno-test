import { create, getNumericDate, verify } from "djwt";
import { config } from "../../config/index.ts";

const algorithm = "HS256";

interface JwtClaims {
  sub: string;
  exp: number;
  type: "access" | "refresh";
}

const encoder = new TextEncoder();
const secretKey = await crypto.subtle.importKey("raw", encoder.encode(config.jwtSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export const createAccessToken = async (userId: string): Promise<string> => {
  const exp = getNumericDate(config.accessTokenTtlMinutes * 60);
  return await create({ alg: algorithm, typ: "JWT" }, { sub: userId, exp, type: "access" }, secretKey);
};

export const createRefreshToken = async (userId: string): Promise<string> => {
  const exp = getNumericDate(config.refreshTokenTtlDays * 24 * 60 * 60);
  return await create({ alg: algorithm, typ: "JWT" }, { sub: userId, exp, type: "refresh" }, secretKey);
};

export const verifyToken = async (token: string): Promise<JwtClaims> => {
  const payload = await verify(token, secretKey, algorithm) as JwtClaims;
  return payload;
};
