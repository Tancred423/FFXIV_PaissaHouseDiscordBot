import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export abstract class BaseCommand {
  abstract readonly data: SlashCommandBuilder;

  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;

  toCommandObject() {
    return {
      data: this.data,
      execute: this.execute.bind(this),
    };
  }
}
