import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../logger/mod.ts";
import { getRequestId } from "./request_id.ts";

export const errorHandlerMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      logger.error("http exception", { requestId: getRequestId(c), error: error.message, status: error.status });
      return c.json({ error: error.message, code: error.status }, error.status);
    }
    logger.error("unexpected error", { requestId: getRequestId(c), error });
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
