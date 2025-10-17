import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.207.0/testing/asserts.ts";

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

Deno.test({
  name: "auth flow end-to-end",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    await setupDatabase();
    await resetDatabase();
    resetRateLimiter();

    const registerRes = await request("/auth/register", {
      email: "user@example.com",
      password: "Password123",
      name: "Test User",
    });
    assertEquals(registerRes.status, 200);
    const registerBody = await registerRes.json() as { userId: string; otp: string };
    assert(registerBody.userId);
    assert(registerBody.otp);

    const auditCount = await withClient(async (client) => {
      const result = await client.queryObject<{ count: bigint }>`SELECT COUNT(*) as count FROM audit_logs`;
      return Number(result.rows[0].count);
    });
    assertEquals(auditCount, 1);

    const verifyRes = await request("/auth/verify-otp", {
      email: "user@example.com",
      code: registerBody.otp,
      type: "register",
    });
    assertEquals(verifyRes.status, 200);
    const verifyBody = await verifyRes.json() as { isVerified?: boolean };
    assertEquals(verifyBody.isVerified, true);

    const wrongLogin = await request("/auth/login", {
      email: "user@example.com",
      password: "WrongPass123",
    });
    assertEquals(wrongLogin.status, 401);

    const failedAuditCount = await withClient(async (client) => {
      const result = await client.queryObject<{ count: bigint }>`SELECT COUNT(*) as count FROM audit_logs WHERE event_type = 'auth.login_failed'`;
      return Number(result.rows[0].count);
    });
    assertEquals(failedAuditCount, 1);

    const loginRes = await request("/auth/login", {
      email: "user@example.com",
      password: "Password123",
    });
    assertEquals(loginRes.status, 200);
    const loginBody = await loginRes.json() as { accessToken: string; refreshToken: string };
    assert(loginBody.accessToken);
    assert(loginBody.refreshToken);

    const sessionCount = await withClient(async (client) => {
      const result = await client.queryObject<{ count: bigint }>`SELECT COUNT(*) as count FROM sessions`;
      return Number(result.rows[0].count);
    });
    assertEquals(sessionCount, 1);

    const refreshRes = await request("/auth/refresh", {
      refreshToken: loginBody.refreshToken,
    });
    assertEquals(refreshRes.status, 200);
    const refreshBody = await refreshRes.json() as { refreshToken: string };
    assert(refreshBody.refreshToken);
    assertNotEquals(refreshBody.refreshToken, loginBody.refreshToken);

    const refreshFail = await request("/auth/refresh", {
      refreshToken: loginBody.refreshToken,
    });
    assertEquals(refreshFail.status, 401);

    const activeSessionCount = await withClient(async (client) => {
      const result = await client.queryObject<{ count: bigint }>`SELECT COUNT(*) as count FROM sessions WHERE revoked_at IS NULL`;
      return Number(result.rows[0].count);
    });
    assertEquals(activeSessionCount, 1);
  },
});
