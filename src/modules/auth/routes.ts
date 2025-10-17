import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { authService } from "./service.ts";
import type { AppError } from "../../utils/error.ts";
import {
  loginRequestSchema,
  loginResponseSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  registerResponseSchema,
  sendOtpRequestSchema,
  verifyOtpRequestSchema,
} from "./schemas.ts";

const registerRoute = createRoute({
  method: "post",
  path: "/auth/register",
  request: {
    body: {
      content: {
        "application/json": {
          schema: registerRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Registration succeeded",
      content: {
        "application/json": {
          schema: registerResponseSchema.extend({ otp: z.string().optional() }),
        },
      },
    },
    409: { description: "User exists" },
  },
});

const sendOtpRoute = createRoute({
  method: "post",
  path: "/auth/send-otp",
  request: {
    body: {
      content: {
        "application/json": {
          schema: sendOtpRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP sent",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), otp: z.string().optional() }),
        },
      },
    },
  },
});

const verifyOtpRoute = createRoute({
  method: "post",
  path: "/auth/verify-otp",
  request: {
    body: {
      content: {
        "application/json": {
          schema: verifyOtpRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP verified",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), isVerified: z.boolean().optional() }),
        },
      },
    },
  },
});

const loginRoute = createRoute({
  method: "post",
  path: "/auth/login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: loginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login success",
      content: {
        "application/json": {
          schema: loginResponseSchema.extend({ refreshToken: z.string() }),
        },
      },
    },
    401: { description: "Invalid credentials" },
  },
});

const refreshRoute = createRoute({
  method: "post",
  path: "/auth/refresh",
  request: {
    body: {
      content: {
        "application/json": {
          schema: refreshRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token refreshed",
      content: {
        "application/json": {
          schema: loginResponseSchema.extend({ refreshToken: z.string() }),
        },
      },
    },
    401: { description: "Invalid session" },
  },
});

const passwordRequestRoute = createRoute({
  method: "post",
  path: "/auth/password/request",
  request: {
    body: {
      content: {
        "application/json": {
          schema: passwordResetRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password reset requested",
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), otp: z.string().optional() }),
        },
      },
    },
  },
});

const passwordResetRoute = createRoute({
  method: "post",
  path: "/auth/password/reset",
  request: {
    body: {
      content: {
        "application/json": {
          schema: passwordResetConfirmSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password reset success",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

const handle = async (c: Context, fn: () => Promise<unknown>) => {
  try {
    const result = await fn();
    return c.json(result);
  } catch (err) {
    const appError = err as AppError;
    if (appError?.code) {
      return c.json({ error: appError.message, code: appError.code }, appError.status);
    }
    throw err;
  }
};

export const authRoutes = (app: OpenAPIHono) => {
  app.openapi(registerRoute, async (c) => {
    const body = registerRequestSchema.parse(await c.req.json());
    return await handle(c, () =>
      authService.register(body, { ip: c.req.header("x-forwarded-for"), userAgent: c.req.header("user-agent") })
    );
  });

  app.openapi(sendOtpRoute, async (c) => {
    const body = sendOtpRequestSchema.parse(await c.req.json());
    return await handle(c, () => authService.sendOtp(body, { ip: c.req.header("x-forwarded-for") }));
  });

  app.openapi(verifyOtpRoute, async (c) => {
    const body = verifyOtpRequestSchema.parse(await c.req.json());
    return await handle(c, () => authService.verifyOtp(body, { ip: c.req.header("x-forwarded-for") }));
  });

  app.openapi(loginRoute, async (c) => {
    const body = loginRequestSchema.parse(await c.req.json());
    return await handle(c, () => authService.login(body, { ip: c.req.header("x-forwarded-for") }));
  });

  app.openapi(refreshRoute, async (c) => {
    const body = refreshRequestSchema.parse(await c.req.json());
    return await handle(c, () => authService.refresh(body));
  });

  app.openapi(passwordRequestRoute, async (c) => {
    const body = passwordResetRequestSchema.parse(await c.req.json());
    return await handle(c, () => authService.requestPasswordReset(body, { ip: c.req.header("x-forwarded-for") }));
  });

  app.openapi(passwordResetRoute, async (c) => {
    const body = passwordResetConfirmSchema.parse(await c.req.json());
    return await handle(c, () => authService.resetPassword(body, { ip: c.req.header("x-forwarded-for") }));
  });
};
