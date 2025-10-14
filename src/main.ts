import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { BaseCommand } from "./types/BaseCommand.ts";
import { DatabaseService } from "./services/DatabaseService.ts";
import { AnnouncementSchedulerService } from "./services/AnnouncementSchedulerService.ts";

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});
const commands = new Map<string, ReturnType<BaseCommand["toCommandObject"]>>();

function setPresence() {
  client.user?.setPresence({
    activities: [{
      name: "/help, /paissa, /announcement",
      type: ActivityType.Custom,
    }],
    status: "online",
  });
}

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
          console.log(`[WARNING] No class found in ${fileName}`);
          continue;
        }

        const commandInstance = new exportedClass();
        const command = commandInstance.toCommandObject();

        if (!command || !("data" in command) || !("execute" in command)) {
          console.log(
            `[WARNING] The command at ${fileName} is missing a required "data" or "execute" property.`,
          );
          continue;
        }

        commands.set(command.data.name, command);
      } catch (error) {
        console.error(`[ERROR] Failed to load command ${fileName}:`, error);
      }
    }
  } catch (error) {
    console.error("[ERROR] Failed to read commands directory:", error);
  }
}

client.once(Events.ClientReady, async () => {
  DatabaseService.initialize();
  await loadCommands();
  setPresence();
  console.log(
    `Logged in as ${client.user?.tag} with ${commands.size} commands`,
  );

  const scheduler = new AnnouncementSchedulerService(client);
  scheduler.start();

  setInterval(setPresence, 60 * 60 * 1000);
});

client.on(Events.GuildDelete, (guild) => {
  const removed = DatabaseService.removeAnnouncementChannel(guild.id);
  if (removed) {
    console.log(
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
      console.log(
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
    console.error(`No command matching ${commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Error handling command:", error);

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
  console.error("DISCORD_BOT_TOKEN environment variable is required");
  Deno.exit(1);
}

client.login(token);
