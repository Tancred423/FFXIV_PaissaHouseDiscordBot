import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "mysql",
  dbCredentials: {
    host: Deno.env.get("MYSQL_HOST") || "localhost",
    user: Deno.env.get("MYSQL_USER") || "paissa_user",
    password: Deno.env.get("MYSQL_PASSWORD") || "",
    database: Deno.env.get("MYSQL_DATABASE") || "paissa_bot",
  },
});
