import { config } from "../config/index.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  [key: string]: unknown;
}

function baseLog(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    request_id: context.requestId,
    context: { ...context, requestId: undefined },
    env: config.appEnv,
  };
  console.log(JSON.stringify(payload));
}

export const logger = {
  debug: (message: string, context?: LogContext) => baseLog("debug", message, context),
  info: (message: string, context?: LogContext) => baseLog("info", message, context),
  warn: (message: string, context?: LogContext) => baseLog("warn", message, context),
  error: (message: string, context?: LogContext) => baseLog("error", message, context),
};
