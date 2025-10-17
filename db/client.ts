import { Pool } from "../deps.ts";
import { DB } from "../config/env.ts";

// Pool connection options
const POOL_CONNECTIONS = 3;

const pool = new Pool(
  {
    user: DB.user,
    password: DB.password,
    database: DB.database,
    hostname: DB.hostname,
    port: DB.port,
  },
  POOL_CONNECTIONS,
);

export default pool;
