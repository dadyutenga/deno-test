mport { Application } from "./deps.ts";
import userRouter from "./routes/user.routes.ts";
import { PORT } from "./config/env.ts";

const app = new Application();

app.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  await next();
});

app.use(userRouter.routes());
app.use(userRouter.allowedMethods());

console.log(`🚀 Server listening on http://localhost:${PORT}`);
await app.listen({ port: PORT });
