import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { Cron } from "croner";
import { DatabaseService } from "./DatabaseService.ts";
import { ColorHelper } from "../utils/ColorHelper.ts";
import { LottoPhase } from "../types/ApiEnums.ts";
import { Logger } from "../utils/Logger.ts";
import { LotteryPhaseHelper } from "../utils/LotteryPhaseHelper.ts";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export class AnnouncementSchedulerService {
  private client: Client;
  private cleanupIntervalId?: number;
  private phaseCron?: Cron;
  private nextPhaseChangeTime?: Date;
  private nextPhaseType?: LottoPhase;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    Logger.info("SCHEDULER", "Starting announcement scheduler service...");

    // Schedule immediate check for phase information
    this.schedulePhaseChangeAnnouncement();

    // Schedule daily cleanup
    this.cleanupDeadData();
    this.cleanupIntervalId = setInterval(
      () => this.cleanupDeadData(),
      CLEANUP_INTERVAL_MS,
    );
  }

  // Legacy method for compatibility
  check(): void {
    // This method is kept for backward compatibility
    // It no longer does phase change detection
    Logger.info("SCHEDULER", "Legacy check method called - no action taken");
  }

  stop(): void {
    // Clean up the cron job if it exists
    if (this.phaseCron) {
      this.phaseCron.stop();
      this.phaseCron = undefined;
    }

    // Clean up interval for data cleanup
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  private async schedulePhaseChangeAnnouncement(): Promise<void> {
    try {
      Logger.info("SCHEDULER", "Scheduling next phase change announcement...");

      // Get the current or latest lottery phase using the helper
      const phaseInfo = await LotteryPhaseHelper
        .getCurrentOrLatestLotteryPhase();

      if (!phaseInfo) {
        Logger.warn(
          "SCHEDULER",
          "No phase information available. Will retry in 1 hour",
        );
        // If no phase info is available, try again in an hour
        setTimeout(
          () => this.schedulePhaseChangeAnnouncement(),
          60 * 60 * 1000,
        );
        return;
      }

      // If the phase isn't current, no need to schedule
      if (!phaseInfo.isCurrent) {
        Logger.info(
          "SCHEDULER",
          "No current phase running. Will retry in 1 hour",
        );
        // Try again in an hour
        setTimeout(
          () => this.schedulePhaseChangeAnnouncement(),
          60 * 60 * 1000,
        );
        return;
      }

      // Calculate when to announce the next phase
      const phaseChangeTime = new Date(phaseInfo.until * 1000);

      // Determine what the next phase will be
      const nextPhase = phaseInfo.phase === LottoPhase.ENTRY
        ? LottoPhase.RESULTS
        : LottoPhase.ENTRY;

      Logger.info(
        "SCHEDULER",
        `Scheduling announcement for phase ${
          LottoPhase[nextPhase]
        } at ${phaseChangeTime.toISOString()}`,
      );

      // Store information about the next phase change
      this.nextPhaseChangeTime = phaseChangeTime;
      this.nextPhaseType = nextPhase;

      // Clear existing cron job if it exists
      if (this.phaseCron) {
        this.phaseCron.stop();
      }

      // Schedule the phase change announcement exactly at phase change time
      this.phaseCron = new Cron(phaseChangeTime, async () => {
        await this.sendAnnouncements(this.nextPhaseType!);

        // After sending the announcement, schedule the next one
        // Give a small delay to allow phase data to update
        setTimeout(() => this.schedulePhaseChangeAnnouncement(), 5 * 60 * 1000);
      });
    } catch (error) {
      Logger.error("SCHEDULER", "Error scheduling phase announcement", error);
      // Try again in an hour if there's an error
      setTimeout(() => this.schedulePhaseChangeAnnouncement(), 60 * 60 * 1000);
    }
  }

  private async sendAnnouncements(phase: LottoPhase): Promise<void> {
    try {
      Logger.info(
        "SCHEDULER",
        `Sending announcements for phase ${LottoPhase[phase]}`,
      );
      const guildSettings = DatabaseService.getAllGuildSettings();

      let title: string;
      let description: string;

      if (phase === LottoPhase.ENTRY) {
        title = "Entry Period started";
        description =
          "The housing lottery entry period has started!\nYou can now place bids on available plots.\n\nUse `/paissa` to check available plots on your world.\n\nThe entry phase typically lasts 5 days, but may vary due to maintenance or events.";
      } else if (phase === LottoPhase.RESULTS) {
        title = "Results Period started";
        description =
          "Lottery results are now available!\nCheck in-game to see if you won your plot.\n\nUse `/paissa` to see which plots will be available next.\n\nThe result phase typically lasts 4 days, but may vary due to maintenance or events.";
      } else {
        Logger.warn(
          "SCHEDULER",
          `Unknown phase ${phase}, not sending announcements`,
        );
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      for (const settings of guildSettings) {
        try {
          const channel = await this.client.channels.fetch(
            settings.announcementChannelId,
          );

          if (!channel || !(channel instanceof TextChannel)) {
            Logger.warn(
              "SCHEDULER",
              `Channel ${settings.announcementChannelId} not found or not a text channel`,
            );
            failureCount++;
            continue;
          }

          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setThumbnail("https://zhu.codes/assets/PaissaLogo.c38c9420.png")
            .setColor(ColorHelper.getEmbedColor());

          await channel.send({ embeds: [embed] });
          Logger.info(
            "SCHEDULER",
            `Sent ${
              LottoPhase[phase]
            } announcement to guild ${settings.guildId}`,
          );
          successCount++;
        } catch (error) {
          Logger.error(
            "SCHEDULER",
            `Error sending announcement to guild ${settings.guildId}`,
            error,
          );
          failureCount++;
        }
      }

      Logger.info(
        "SCHEDULER",
        `Announcements sent: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      Logger.error("SCHEDULER", "Error in sendAnnouncements", error);
    }
  }

  private async cleanupDeadData(): Promise<void> {
    try {
      Logger.info(
        "CLEANUP",
        "Running periodic cleanup of dead guild/channel data...",
      );
      const guildSettings = DatabaseService.getAllGuildSettings();
      let cleanedCount = 0;

      for (const settings of guildSettings) {
        try {
          const guild = await this.client.guilds.fetch(settings.guildId);
          if (!guild) {
            DatabaseService.removeAnnouncementChannel(settings.guildId);
            cleanedCount++;
            Logger.info(
              "CLEANUP",
              `Cleaned up settings for non-existent guild ${settings.guildId}`,
            );
            continue;
          }

          const channel = await this.client.channels.fetch(
            settings.announcementChannelId,
          );
          if (!channel || !(channel instanceof TextChannel)) {
            DatabaseService.removeAnnouncementChannel(settings.guildId);
            cleanedCount++;
            Logger.info(
              "CLEANUP",
              `Cleaned up settings for non-existent channel ${settings.announcementChannelId}`,
            );
          }
        } catch (error) {
          Logger.error(
            "CLEANUP",
            `Failed to cleanup guild ${settings.guildId}`,
            error,
          );
        }
      }

      Logger.info(
        "CLEANUP",
        `Cleanup completed successfully with ${cleanedCount} entries removed`,
      );
    } catch (error) {
      Logger.error("CLEANUP", "Error in cleanupDeadData", error);
    }
  }
}
