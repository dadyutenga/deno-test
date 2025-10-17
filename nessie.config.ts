import { ClientPostgreSQL, NessieConfig } from "https://deno.land/x/nessie@2.0.10/mod.ts";
import { config } from "./src/config/index.ts";

const client = new ClientPostgreSQL({
  connectionString: config.databaseUrl,
});

const nessieConfig: NessieConfig = {
  client,
  migrations: {
    table: "migrations",
    folder: "./migrations",
  },
};

export default nessieConfig;
