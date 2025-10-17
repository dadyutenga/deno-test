import { Pool, PoolClient } from "postgres";
import { config } from "../config/index.ts";

const pool = new Pool(config.databaseUrl, 10, true);

export const getPool = () => pool;

export const withClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const connection = await pool.connect();
  try {
    return await fn(connection);
  } finally {
    connection.release();
  }
};
