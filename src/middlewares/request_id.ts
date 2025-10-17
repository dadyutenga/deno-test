import type { Context, MiddlewareHandler } from "hono";

export const REQUEST_ID_HEADER = "x-request-id";

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const existingId = c.req.header(REQUEST_ID_HEADER);
  const requestId = existingId ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.res.headers.set(REQUEST_ID_HEADER, requestId);
  await next();
};

export const getRequestId = (c: Context): string | undefined => c.get("requestId");
