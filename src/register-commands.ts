import {
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { config } from "dotenv";
import { BaseCommand } from "./types/BaseCommand.ts";
import { Logger } from "./utils/Logger.ts";

config();

const commands = await collectCommands();
const rest = new REST({ version: "10" }).setToken(
  Deno.env.get("DISCORD_BOT_TOKEN")!,
);
await applyCommandsToApplication();

async function collectCommands(): Promise<
  RESTPostAPIChatInputApplicationCommandsJSONBody[]
> {
  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  try {
    const commandDir = "./src/commands";
    const entries = Array.from(Deno.readDirSync(commandDir));

    for (const entry of entries) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) {
        continue;
      }

      const fileName = entry.name;
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

      if (!command && !("data" in command) && !("execute" in command)) {
        Logger.warn(
          "STARTUP",
          `The command at ${fileName} is missing a required "data" or "execute" property.`,
        );
        continue;
      }

      commands.push(
        command.data
          .toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody,
      );
    }
  } catch (error) {
    Logger.error("STARTUP", "Failed to read commands directory", error);
  }

  return commands;
}

async function applyCommandsToApplication(): Promise<void> {
  try {
    const environment = Deno.env.get("ENVIRONMENT") || "development";
    const clientId = Deno.env.get("DISCORD_CLIENT_ID");

    if (!clientId) {
      throw new Error("DISCORD_CLIENT_ID environment variable is required");
    }

    if (environment === "production") {
      Logger.info("STARTUP", "Started refreshing global application commands");
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      Logger.info(
        "STARTUP",
        "Successfully reloaded global application commands",
      );
      return;
    }

    const guildId = Deno.env.get("DISCORD_DEV_GUILD_ID");
    if (!guildId) {
      throw new Error(
        "DISCORD_DEV_GUILD_ID environment variable is required for development mode",
      );
    }

    Logger.info(
      "STARTUP",
      `Started refreshing guild commands for guild ${guildId}`,
    );
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    Logger.info("STARTUP", "Successfully reloaded guild commands");
  } catch (error) {
    Logger.error("STARTUP", "Failed to register commands", error);
  }
}
