export type ErrorCode =
  | "USER_EXISTS"
  | "USER_NOT_FOUND"
  | "USER_NOT_VERIFIED"
  | "INVALID_CREDENTIALS"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_ATTEMPTS_EXCEEDED"
  | "RATE_LIMITED"
  | "SESSION_INVALID"
  | "UNPROCESSABLE";

interface AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;
}

const statusMap: Record<ErrorCode, number> = {
  USER_EXISTS: 409,
  USER_NOT_FOUND: 404,
  USER_NOT_VERIFIED: 403,
  INVALID_CREDENTIALS: 401,
  OTP_INVALID: 400,
  OTP_EXPIRED: 400,
  OTP_ATTEMPTS_EXCEEDED: 429,
  RATE_LIMITED: 429,
  SESSION_INVALID: 401,
  UNPROCESSABLE: 422,
};

export const error = (code: ErrorCode, message: string, details?: unknown): AppError => {
  const err = new Error(message) as AppError;
  err.code = code;
  err.status = statusMap[code];
  err.details = details;
  return err;
};

export type { AppError };
