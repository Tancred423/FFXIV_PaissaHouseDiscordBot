import { EmbedBuilder } from "discord.js";

export class StatusEmbedBuilder {
  static getSuccessEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x6eff6e)
      .setDescription(message);
  }

  static getFailureEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xff7373)
      .setDescription(message);
  }
}
