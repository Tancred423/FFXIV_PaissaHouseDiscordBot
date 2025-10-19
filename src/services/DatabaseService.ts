import { Database } from "@db/sqlite";
import { Logger } from "../utils/Logger.ts";
import { existsSync } from "existsSync";
import { ensureDirSync } from "ensureDirSync";

export interface GuildSettings {
  guildId: string;
  announcementChannelId: string;
}

export class DatabaseService {
  private static db: Database;

  static initialize(): void {
    const dbPath = "./data/paissa_bot.db";
    const dataDir = "./data";

    Logger.info("STARTUP", `Initializing database at: ${dbPath}`);
    Logger.info("STARTUP", `Working directory: ${Deno.cwd()}`);

    if (!existsSync(dataDir)) {
      Logger.info(
        "STARTUP",
        `Data directory does not exist, creating: ${dataDir}`,
      );
      ensureDirSync(dataDir);
    } else {
      Logger.info("STARTUP", `Data directory exists: ${dataDir}`);
    }

    const dbExists = existsSync(dbPath);
    Logger.info(
      "STARTUP",
      `Database file ${dbExists ? "exists" : "does not exist"}`,
    );

    this.db = new Database(dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        announcement_channel_id TEXT NOT NULL
      )
    `);

    const stmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM guild_settings`,
    );
    const result = stmt.get() as { count: number };
    stmt.finalize();

    Logger.info(
      "STARTUP",
      `Database initialized successfully. Existing guild settings: ${result.count}`,
    );
  }

  static getDatabase(): Database {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  static setAnnouncementChannel(
    guildId: string,
    channelId: string,
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO guild_settings (guild_id, announcement_channel_id) 
       VALUES (?, ?)
       ON CONFLICT(guild_id) 
       DO UPDATE SET announcement_channel_id = ?`,
    );
    stmt.run(guildId, channelId, channelId);
    stmt.finalize();
  }

  static removeAnnouncementChannel(guildId: string): boolean {
    const stmt = this.db.prepare(
      `DELETE FROM guild_settings WHERE guild_id = ?`,
    );
    stmt.run(guildId);
    const changes = this.db.changes;
    stmt.finalize();
    return changes > 0;
  }

  static getAnnouncementChannel(
    guildId: string,
  ): string | null {
    const stmt = this.db.prepare(
      `SELECT announcement_channel_id FROM guild_settings WHERE guild_id = ?`,
    );
    const result = stmt.get(guildId) as
      | { announcement_channel_id: string }
      | undefined;
    stmt.finalize();

    if (result) {
      return result.announcement_channel_id;
    }
    return null;
  }

  static getAllGuildSettings(): GuildSettings[] {
    const stmt = this.db.prepare(
      `SELECT guild_id, announcement_channel_id FROM guild_settings`,
    );
    const rows = stmt.all() as Array<
      { guild_id: string; announcement_channel_id: string }
    >;
    stmt.finalize();

    return rows.map((row) => ({
      guildId: row.guild_id,
      announcementChannelId: row.announcement_channel_id,
    }));
  }
}
