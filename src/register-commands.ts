import {
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { config } from "dotenv";
import { BaseCommand } from "./types/BaseCommand.ts";

config();

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
      console.log(`[WARNING] No class found in ${fileName}`);
      continue;
    }

    const commandInstance = new exportedClass();
    const command = commandInstance.toCommandObject();

    if (!command && !("data" in command) && !("execute" in command)) {
      console.log(
        `[WARNING] The command at ${fileName} is missing a required "data" or "execute" property.`,
      );
      continue;
    }

    commands.push(
      command.data
        .toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody,
    );
  }
} catch (error) {
  console.error("[ERROR] Failed to read commands directory:", error);
}

const rest = new REST({ version: "10" }).setToken(
  Deno.env.get("DISCORD_BOT_TOKEN")!,
);

(async () => {
  try {
    const environment = Deno.env.get("ENVIRONMENT") || "development";
    const clientId = Deno.env.get("DISCORD_CLIENT_ID");

    if (!clientId) {
      throw new Error("DISCORD_CLIENT_ID environment variable is required");
    }

    if (environment === "production") {
      console.log("Started refreshing global application (/) commands.");
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log("Successfully reloaded global application (/) commands.");
      return;
    }

    const guildId = Deno.env.get("DISCORD_DEV_GUILD_ID");
    if (!guildId) {
      throw new Error(
        "DISCORD_DEV_GUILD_ID environment variable is required for development mode",
      );
    }

    console.log(`Started refreshing guild (/) commands for guild ${guildId}.`);
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    console.log("Successfully reloaded guild (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
