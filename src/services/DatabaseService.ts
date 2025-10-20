import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { Logger } from "../utils/Logger.ts";
import { type GuildSettings, guildSettings } from "../db/schema.ts";

export class DatabaseService {
  private static connection: mysql.Connection;
  private static db: MySql2Database;

  static async initialize(): Promise<void> {
    const host = Deno.env.get("MYSQL_HOST") || "mysql-server";
    const user = Deno.env.get("MYSQL_USER") || "paissa_user";
    const password = Deno.env.get("MYSQL_PASSWORD");
    const database = Deno.env.get("MYSQL_DATABASE") || "paissa_bot";

    if (!password) {
      throw new Error("MYSQL_PASSWORD environment variable is required");
    }

    try {
      this.connection = await mysql.createConnection({
        host,
        user,
        password,
        database,
      });

      this.db = drizzle(this.connection);

      Logger.info("DATABASE", "Running migrations...");
      await migrate(this.db, { migrationsFolder: "./migrations" });
      Logger.info("DATABASE", "Migrations completed successfully");

      Logger.info("STARTUP", "Database initialized successfully");
    } catch (error) {
      Logger.error("STARTUP", "Failed to connect to MySQL:", error);
      throw error;
    }
  }

  static getDb(): MySql2Database {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  static async setAnnouncementChannel(
    guildId: string,
    channelId: string,
  ): Promise<void> {
    await this.db
      .insert(guildSettings)
      .values({
        guildId,
        announcementChannelId: channelId,
      })
      .onDuplicateKeyUpdate({
        set: { announcementChannelId: channelId },
      });
  }

  static async removeAnnouncementChannel(guildId: string): Promise<boolean> {
    const result = await this.db
      .delete(guildSettings)
      .where(eq(guildSettings.guildId, guildId));

    return result[0].affectedRows > 0;
  }

  static async getAnnouncementChannel(
    guildId: string,
  ): Promise<string | null> {
    const results = await this.db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId))
      .limit(1);

    if (results.length > 0) {
      return results[0].announcementChannelId;
    }
    return null;
  }

  static async getAllGuildSettings(): Promise<GuildSettings[]> {
    return await this.db.select().from(guildSettings);
  }

  static async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  }
}

export type { GuildSettings } from "../db/schema.ts";
