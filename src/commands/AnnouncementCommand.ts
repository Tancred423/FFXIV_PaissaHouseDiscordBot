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
  readonly data = new SlashCommandBuilder()
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

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({
        embeds: [
          StatusEmbedBuilder.getFailureEmbed(
            "This command can only be used in a server.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (subcommand === "set") {
      const channel = interaction.options.getChannel("channel", true);

      if (channel.type !== ChannelType.GuildText) {
        await interaction.editReply({
          embeds: [
            StatusEmbedBuilder.getFailureEmbed(
              "Please select a text channel.",
            ),
          ],
        });
        return;
      }

      DatabaseService.setAnnouncementChannel(
        interaction.guildId,
        channel.id,
      );

      await interaction.editReply({
        embeds: [
          StatusEmbedBuilder.getSuccessEmbed(
            `Announcement channel has been set to <#${channel.id}>.\nYou will receive notifications when new housing lottery periods begin.`,
          ),
        ],
      });
    } else if (subcommand === "remove") {
      const removed = DatabaseService.removeAnnouncementChannel(
        interaction.guildId,
      );

      if (removed) {
        await interaction.editReply({
          embeds: [
            StatusEmbedBuilder.getSuccessEmbed(
              "Announcement channel setting has been removed.\nYou will no longer receive lottery notifications.",
            ),
          ],
        });
      } else {
        await interaction.editReply({
          embeds: [
            StatusEmbedBuilder.getSuccessEmbed(
              "There was already no announcement channel setting.",
            ),
          ],
        });
      }
    }
  }
}
