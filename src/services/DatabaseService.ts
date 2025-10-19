import { Database } from "@db/sqlite";
import { Logger } from "../utils/Logger.ts";

export interface GuildSettings {
  guildId: string;
  announcementChannelId: string;
}

export class DatabaseService {
  private static db: Database;

  static initialize(): void {
    const dbPath = "/app/data/paissa_bot.db";
    const dataDir = "/app/data";

    Logger.info("STARTUP", `Initializing database at ${dbPath}`);

    // Ensure the data directory exists and is writable
    try {
      try {
        const info = Deno.statSync(dataDir);
        Logger.info(
          "STARTUP",
          `Data directory exists: ${dataDir}, isDirectory: ${info.isDirectory}`,
        );
      } catch (err) {
        const error = err as Error;
        Logger.warn("STARTUP", `Data directory check failed: ${error.message}`);
        Deno.mkdirSync(dataDir, { recursive: true });
        Logger.info("STARTUP", "Created data directory");
      }

      // Test write permissions by creating a temporary file
      const testPath = `${dataDir}/write_test.tmp`;
      try {
        Deno.writeTextFileSync(testPath, "test");
        Deno.removeSync(testPath);
        Logger.info("STARTUP", "Data directory is writable");
      } catch (err) {
        const error = err as Error;
        Logger.error(
          "STARTUP",
          `Data directory is not writable: ${error.message}`,
        );
      }
    } catch (err) {
      const error = err as Error;
      Logger.error(
        "STARTUP",
        `Failed to setup data directory: ${error.message}`,
      );
    }

    try {
      this.db = new Database(dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS guild_settings (
          guild_id TEXT PRIMARY KEY,
          announcement_channel_id TEXT NOT NULL
        )
      `);

      // Test query to verify db is working
      const result = this.db.prepare(
        "SELECT count(*) as count FROM guild_settings",
      ).get() as { count: number };
      Logger.info(
        "STARTUP",
        `Database connection verified. Guild settings count: ${result.count}`,
      );

      Logger.info("STARTUP", "Database initialized successfully");
    } catch (err) {
      const error = err as Error;
      Logger.error(
        "STARTUP",
        `Database initialization failed: ${error.message}`,
      );
      throw error; // Re-throw to ensure app doesn't start with broken DB
    }
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
