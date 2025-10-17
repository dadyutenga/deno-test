import type { MiddlewareHandler } from "hono";
import { logger } from "../logger/mod.ts";
import { getRequestId } from "./request_id.ts";

export const loggingMiddleware: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  await next();
  const duration = Number((performance.now() - start).toFixed(2));
  logger.info("request completed", {
    requestId: getRequestId(c),
    method: c.req.method,
    url: c.req.url,
    status: c.res.status,
    duration,
  });
};
