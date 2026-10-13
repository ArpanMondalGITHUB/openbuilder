import pg from "pg";
import { config } from "../config/auth.config";

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: !config.dbSslInsecure },
});

export default pool;
