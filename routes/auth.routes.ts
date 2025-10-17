import { Router } from "../deps.ts";
import * as authService from "../services/auth.service.ts";

const router = new Router();

router.post("/auth/register", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { email, password, name } = body;
    if (!email || !password || !name) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email, password, and name are required" };
      return;
    }
    await authService.register(email, password, name);
    ctx.response.status = 201;
    ctx.response.body = {
      message: "User registered. Check your email for OTP.",
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

router.post("/auth/login", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { email, password } = body;
    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email and password are required" };
      return;
    }
    const user = await authService.login(email, password);
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid credentials" };
      return;
    }
    ctx.response.body = { user };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

router.post("/auth/send-otp", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { email } = body;
    if (!email) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email is required" };
      return;
    }
    await authService.sendOTP(email);
    ctx.response.body = { message: "OTP sent to your email" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

router.post("/auth/verify-otp", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { email, otp } = body;
    if (!email || !otp) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email and OTP are required" };
      return;
    }
    const success = await authService.verifyOTP(email, otp);
    if (!success) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid or expired OTP" };
      return;
    }
    ctx.response.body = { message: "Account verified successfully" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

export default router;
