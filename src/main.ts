import { config } from "./config/index.ts";
import { createApp } from "./app.ts";
import { logger } from "./logger/mod.ts";

const app = createApp();

logger.info("starting server", { port: config.appPort });

Deno.serve({ port: config.appPort }, app.fetch);
