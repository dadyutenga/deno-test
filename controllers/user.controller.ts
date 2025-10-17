import type { Context } from "../deps.ts";
import * as userService from "../services/user.service.ts";

export const getUsers = async (ctx: Context) => {
  const users = await userService.getAll();
  ctx.response.status = 200;
  ctx.response.body = { data: users };
};

export const getUser = async (ctx: Context) => {
  const id = Number(ctx.params.id);
  const user = await userService.getById(id);
  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = { error: "User not found" };
    return;
  }
  ctx.response.body = { data: user };
};

export const createUser = async (ctx: Context) => {
  const body = await ctx.request.body().value;
  if (!body?.name || !body?.email) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing name or email" };
    return;
  }
  const user = await userService.create({ name: body.name, email: body.email });
  ctx.response.status = 201;
  ctx.response.body = { data: user };
};

export const updateUser = async (ctx: Context) => {
  const id = Number(ctx.params.id);
  const body = await ctx.request.body().value;
  const user = await userService.update(id, body);
  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = { error: "User not found" };
    return;
  }
  ctx.response.body = { data: user };
};

export const deleteUser = async (ctx: Context) => {
  const id = Number(ctx.params.id);
  await userService.remove(id);
  ctx.response.status = 204;
};
