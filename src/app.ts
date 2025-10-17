import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "./logger/mod.ts";
import { requestIdMiddleware } from "./middlewares/request_id.ts";
import { loggingMiddleware } from "./middlewares/logging.ts";
import { authRoutes } from "./modules/auth/routes.ts";
import { config } from "./config/index.ts";

export const createApp = () => {
  const app = new OpenAPIHono();

  app.use("*", requestIdMiddleware);
  app.use("*", loggingMiddleware);

  app.onError((err, c) => {
    logger.error("unhandled exception", { error: err.message, stack: err.stack, requestId: c.get("requestId") });
    return c.json({ error: err.message }, 500);
  });

  authRoutes(app);

  app.doc("/docs/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Auth Service API",
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://localhost:${config.appPort}`,
      },
    ],
  });

  return app;
};
