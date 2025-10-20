import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { Logger } from "../utils/Logger.ts";

config();

const host = Deno.env.get("MYSQL_HOST") || "mysql-server";
const user = Deno.env.get("MYSQL_USER") || "paissa_user";
const password = Deno.env.get("MYSQL_PASSWORD");
const database = Deno.env.get("MYSQL_DATABASE") || "paissa_bot";

if (!password) {
  throw new Error("MYSQL_PASSWORD environment variable is required");
}

async function runMigrations() {
  try {
    Logger.info("DATABASE", "Running migrations...");

    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
    });

    const db = drizzle(connection);

    await migrate(db, { migrationsFolder: "./migrations" });

    Logger.info("DATABASE", "All migrations completed successfully");

    await connection.end();
  } catch (error) {
    Logger.error("DATABASE", "Failed to run migrations", error);
    throw error;
  }
}

await runMigrations();
