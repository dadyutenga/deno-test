import { assertEquals } from "https://deno.land/std@0.207.0/testing/asserts.ts";

import { resetDatabase, setupDatabase } from "./setup.ts";
import { resetRateLimiter } from "../src/utils/rate_limiter.ts";
import { withClient } from "../src/db/pool.ts";

const { createApp } = await import("../src/app.ts");
const app = createApp();

const request = async (path: string, body: unknown) =>
  await app.request(`http://test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const registerUser = async (email: string) => {
  const res = await request("/auth/register", {
    email,
    password: "Password123",
    name: "OTP User",
  });
  const body = await res.json() as { otp: string };
  return body.otp;
};

await setupDatabase();

Deno.test({
  name: "otp flows",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn(t) {
    await t.step("send OTP rate limits are enforced", async () => {
      await resetDatabase();
      resetRateLimiter();
      const email = `${crypto.randomUUID()}@example.com`;
      await registerUser(email);
      for (let i = 0; i < 2; i++) {
        const res = await request("/auth/send-otp", { email, type: "register" });
        assertEquals(res.status, 200);
      }
      const limited = await request("/auth/send-otp", { email, type: "register" });
      assertEquals(limited.status, 200);
      const blocked = await request("/auth/send-otp", { email, type: "register" });
      assertEquals(blocked.status, 429);
    });

    await t.step("verifying wrong code increments attempts", async () => {
      await resetDatabase();
      resetRateLimiter();
      const email = `${crypto.randomUUID()}@example.com`;
      await registerUser(email);
      const wrong = await request("/auth/verify-otp", { email, code: "000000", type: "register" });
      assertEquals(wrong.status, 400);

      const attempts = await withClient(async (client) => {
        const result = await client.queryObject<{ attempts: number }>`SELECT attempts FROM otp_codes LIMIT 1`;
        return result.rows[0].attempts;
      });
      assertEquals(attempts, 1);
    });

    await t.step("expired OTP fails", async () => {
      await resetDatabase();
      resetRateLimiter();
      const email = `${crypto.randomUUID()}@example.com`;
      const otp = await registerUser(email);
      await withClient(async (client) => {
        await client.queryArray`UPDATE otp_codes SET expires_at = now() - interval '1 minute'`;
      });
      const res = await request("/auth/verify-otp", { email, code: otp, type: "register" });
      assertEquals(res.status, 400);
    });

    await t.step("password reset flow", async () => {
      await resetDatabase();
      resetRateLimiter();
      const email = `${crypto.randomUUID()}@example.com`;
      const registerOtp = await registerUser(email);
      await request("/auth/verify-otp", { email, code: registerOtp, type: "register" });

      const requestReset = await request("/auth/password/request", { email });
      assertEquals(requestReset.status, 200);
      const resetBody = await requestReset.json() as { otp: string };

      const resetRes = await request("/auth/password/reset", {
        email,
        code: resetBody.otp,
        newPassword: "NewPassword123",
      });
      assertEquals(resetRes.status, 200);

      const loginOld = await request("/auth/login", { email, password: "Password123" });
      assertEquals(loginOld.status, 401);

      const loginNew = await request("/auth/login", { email, password: "NewPassword123" });
      assertEquals(loginNew.status, 200);
    });
  },
});
