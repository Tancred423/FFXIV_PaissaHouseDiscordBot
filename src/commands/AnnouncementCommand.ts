import {
  ChannelType,
  ChatInputCommandInteraction,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { BaseCommand } from "../types/BaseCommand.ts";
import { DatabaseService } from "../services/DatabaseService.ts";
import { StatusEmbedBuilder } from "../utils/StatusEmbedBuilder.ts";

export class AnnouncementCommand extends BaseCommand {
  readonly data = this.createAnnouncementCommandBuilder();

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    switch (subcommand) {
      case "set":
        this.handleSetSubcommand(interaction);
        break;
      case "remove":
        this.handleRemoveSubcommand(interaction);
        break;
    }
  }

  private createAnnouncementCommandBuilder(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName("announcement")
      .setDescription("Manage lottery announcement settings")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .setContexts(InteractionContextType.Guild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName("set")
          .setDescription(
            "Set the channel for lottery phase announcements",
          )
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription(
                "The text channel to send announcements to",
              )
              .setRequired(true)
              .addChannelTypes(ChannelType.GuildText)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove")
          .setDescription("Remove the announcement channel setting")
      ) as SlashCommandBuilder;
  }

  private async handleSetSubcommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const channel = interaction.options.getChannel("channel", true);

    DatabaseService.setAnnouncementChannel(
      interaction.guildId!,
      channel.id,
    );

    const embed = StatusEmbedBuilder.getSuccessEmbed(
      `Announcement channel has been set to <#${channel.id}>.\nYou will receive notifications when new housing lottery periods begin.`,
    );
    await interaction.editReply({ embeds: [embed] });
  }

  private async handleRemoveSubcommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const hasBeenRemoved = DatabaseService.removeAnnouncementChannel(
      interaction.guildId!,
    );

    const embed = StatusEmbedBuilder.getSuccessEmbed(
      hasBeenRemoved
        ? "Announcement channel setting has been removed.\nYou will no longer receive lottery notifications."
        : "There was already no announcement channel setting.",
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
