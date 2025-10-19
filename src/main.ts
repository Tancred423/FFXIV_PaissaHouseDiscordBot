import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { Cron } from "croner";
import { BaseCommand } from "./types/BaseCommand.ts";
import { DatabaseService } from "./services/DatabaseService.ts";
import { AnnouncementSchedulerService } from "./services/AnnouncementSchedulerService.ts";
import { Logger } from "./utils/Logger.ts";
import { PresenceService } from "./services/PresenceService.ts";

config();

const logTimezone = Deno.env.get("LOG_TIMEZONE") || "UTC";
Logger.setTimezone(logTimezone);

// Log system information for debugging
Logger.info(
  "SYSTEM",
  `Running as user: ${Deno.uid?.() ?? "unknown"} group: ${
    Deno.gid?.() ?? "unknown"
  }`,
);
Logger.info("SYSTEM", `Current directory: ${Deno.cwd()}`);
Logger.info(
  "SYSTEM",
  `Deployment hash: ${Deno.env.get("DEPLOYMENT_HASH") || "development"}`,
);

// Check data directory accessibility
try {
  const dataDir = "/app/data";
  try {
    const stat = Deno.statSync(dataDir);
    Logger.info(
      "SYSTEM",
      `Data directory exists: ${stat.isDirectory}, size: ${stat.size}, modified: ${stat.mtime}`,
    );
  } catch (err) {
    Logger.warn(
      "SYSTEM",
      `Data directory does not exist yet: ${(err as Error).message}`,
    );
    Deno.mkdirSync(dataDir, { recursive: true });
    Logger.info("SYSTEM", `Created data directory: ${dataDir}`);
  }

  // List all files in the current directory and data directory
  Logger.info("SYSTEM", "Files in current directory:");
  for (const entry of Deno.readDirSync(".")) {
    Logger.info(
      "SYSTEM",
      `  ${entry.name} ${entry.isDirectory ? "[DIR]" : "[FILE]"}`,
    );
  }

  Logger.info("SYSTEM", "Files in data directory:");
  try {
    for (const entry of Deno.readDirSync(dataDir)) {
      Logger.info(
        "SYSTEM",
        `  ${entry.name} ${entry.isDirectory ? "[DIR]" : "[FILE]"}`,
      );
    }
  } catch (err) {
    Logger.error(
      "SYSTEM",
      `Cannot list data directory: ${(err as Error).message}`,
    );
  }
} catch (err) {
  Logger.error("SYSTEM", `File system check failed: ${(err as Error).message}`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});
const commands = new Map<string, ReturnType<BaseCommand["toCommandObject"]>>();

async function loadCommands() {
  try {
    const commandDir = "./src/commands";
    const entries = Array.from(Deno.readDirSync(commandDir));

    for (const entry of entries) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) {
        continue;
      }

      const fileName = entry.name;

      try {
        const commandModule = await import(`./commands/${fileName}`);
        const exportedClass = Object.values(commandModule).find(
          (exported) => typeof exported === "function" && exported.prototype,
        ) as new () => BaseCommand;

        if (!exportedClass) {
          Logger.warn("STARTUP", `No class found in ${fileName}`);
          continue;
        }

        const commandInstance = new exportedClass();
        const command = commandInstance.toCommandObject();

        if (!command || !("data" in command) || !("execute" in command)) {
          Logger.warn(
            "STARTUP",
            `The command at ${fileName} is missing a required "data" or "execute" property.`,
          );
          continue;
        }

        commands.set(command.data.name, command);
      } catch (error) {
        Logger.error("STARTUP", `Failed to load command ${fileName}`, error);
      }
    }
  } catch (error) {
    Logger.error("STARTUP", "Failed to read commands directory", error);
  }
}

client.once(Events.ClientReady, async () => {
  await loadCommands();
  Logger.info(
    "STARTUP",
    `Discord initialized successfully as ${client.user?.tag} with ${commands.size} commands`,
  );

  DatabaseService.initialize();

  const presenceService = new PresenceService(client);
  await presenceService.updatePresence();
  new Cron("0 * * * *", () => presenceService.updatePresence());

  Logger.info(
    "STARTUP",
    "Presence update scheduled to run at the top of each hour",
  );

  const scheduler = new AnnouncementSchedulerService(client);
  scheduler.start();
});

client.on(Events.GuildDelete, (guild) => {
  const removed = DatabaseService.removeAnnouncementChannel(guild.id);
  if (removed) {
    Logger.info(
      "CLEANUP",
      `Cleaned up announcement settings for guild ${guild.id} (${guild.name})`,
    );
  }
});

client.on(Events.ChannelDelete, (channel) => {
  if (!channel.isDMBased() && channel.guildId) {
    const storedChannelId = DatabaseService.getAnnouncementChannel(
      channel.guildId,
    );
    if (storedChannelId === channel.id) {
      DatabaseService.removeAnnouncementChannel(channel.guildId);
      Logger.info(
        "CLEANUP",
        `Cleaned up announcement settings for deleted channel ${channel.id} in guild ${channel.guildId}`,
      );
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const command = commands.get(commandName);

  if (!command) {
    Logger.error("COMMAND", `No command matching ${commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    Logger.error("COMMAND", `Error handling command ${commandName}`, error);

    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error occurred";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `❌ Error: ${errorMessage}`,
      });
      return;
    }

    await interaction.reply({
      content: `❌ Error: ${errorMessage}`,
      ephemeral: true,
    });
  }
});

const token = Deno.env.get("DISCORD_BOT_TOKEN");
if (!token) {
  Logger.error("STARTUP", "DISCORD_BOT_TOKEN environment variable is required");
  Deno.exit(1);
}

client.login(token);
