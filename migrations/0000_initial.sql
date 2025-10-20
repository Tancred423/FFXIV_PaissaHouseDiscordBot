CREATE TABLE IF NOT EXISTS `guild_settings` (
	`guild_id` varchar(30) NOT NULL,
	`announcement_channel_id` varchar(30) NOT NULL,
	CONSTRAINT `guild_settings_guild_id` PRIMARY KEY(`guild_id`)
);
