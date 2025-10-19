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
    if (!existsSync("./data")) {
      ensureDirSync("./data");
    }
    this.db = new Database("./data/paissa_bot.db");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        announcement_channel_id TEXT NOT NULL
      )
    `);

    Logger.info("STARTUP", "Database initialized successfully");
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
