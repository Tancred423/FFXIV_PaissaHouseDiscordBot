import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const guildSettings = mysqlTable("guild_settings", {
  guildId: varchar("guild_id", { length: 20 }).primaryKey(),
  announcementChannelId: varchar("announcement_channel_id", { length: 20 })
    .notNull(),
});

export type GuildSettings = typeof guildSettings.$inferSelect;
export type NewGuildSettings = typeof guildSettings.$inferInsert;
