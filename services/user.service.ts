import pool from "../db/client.ts";
import type { User } from "../models/user.model.ts";

export const getAll = async (): Promise<User[]> => {
  const client = await pool.connect();
  try {
    const result = await client.queryObject<User>(
      "SELECT id, name, email, is_verified, created_at FROM users ORDER BY id",
    );
    return result.rows;
  } finally {
    client.release();
  }
};

export const getById = async (id: number): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const result = await client.queryObject<User>(
      "SELECT id, name, email, is_verified, created_at FROM users WHERE id = $1",
      [id],
    );
    return result.rows[0] ?? null;
  } finally {
    client.release();
  }
};

export const create = async (payload: Partial<User>): Promise<User> => {
  const { name, email, password_hash, is_verified } = payload;
  const client = await pool.connect();
  try {
    const result = await client.queryObject<User>(
      `INSERT INTO users (name, email, password_hash, is_verified) VALUES ($1, $2, $3, $4) RETURNING id, name, email, is_verified, created_at`,
      [name, email, password_hash, is_verified],
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const update = async (
  id: number,
  payload: Partial<User>,
): Promise<User | null> => {
  const { name, email, is_verified } = payload;
  const client = await pool.connect();
  try {
    const result = await client.queryObject<User>(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), is_verified = COALESCE($3, is_verified) WHERE id = $4 RETURNING id, name, email, is_verified, created_at`,
      [name, email, is_verified, id],
    );
    return result.rows[0] ?? null;
  } finally {
    client.release();
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.queryObject("DELETE FROM users WHERE id = $1", [id]);
    return true;
  } finally {
    client.release();
  }
};
