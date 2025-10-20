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
  private nextPhaseType?: LottoPhase;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    Logger.info("SCHEDULER", "Starting announcement scheduler service...");

    this.schedulePhaseChangeAnnouncement();

    this.cleanupDeadData();
    this.cleanupIntervalId = setInterval(
      () => this.cleanupDeadData(),
      CLEANUP_INTERVAL_MS,
    );
  }

  stop(): void {
    if (this.phaseCron) {
      this.phaseCron.stop();
      this.phaseCron = undefined;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  private async schedulePhaseChangeAnnouncement(): Promise<void> {
    try {
      Logger.info("SCHEDULER", "Scheduling next phase change announcement...");

      const phaseInfo = await LotteryPhaseHelper
        .getCurrentOrLatestLotteryPhase();

      if (!phaseInfo) {
        Logger.warn(
          "SCHEDULER",
          "No phase information available. Will retry in 1 hour",
        );
        setTimeout(
          () => this.schedulePhaseChangeAnnouncement(),
          60 * 60 * 1000,
        );
        return;
      }

      if (!phaseInfo.isCurrent) {
        Logger.info(
          "SCHEDULER",
          "No current phase running. Will retry in 1 hour",
        );
        setTimeout(
          () => this.schedulePhaseChangeAnnouncement(),
          60 * 60 * 1000,
        );
        return;
      }

      const phaseChangeTime = new Date(phaseInfo.until * 1000);

      const nextPhase = phaseInfo.phase === LottoPhase.ENTRY
        ? LottoPhase.RESULTS
        : LottoPhase.ENTRY;

      this.nextPhaseType = nextPhase;

      if (this.phaseCron) {
        this.phaseCron.stop();
      }

      this.phaseCron = new Cron(phaseChangeTime, async () => {
        await this.sendAnnouncements(this.nextPhaseType!);
        setTimeout(() => this.schedulePhaseChangeAnnouncement(), 5 * 60 * 1000);
      });

      Logger.info(
        "SCHEDULER",
        `Scheduled announcement for phase ${
          LottoPhase[nextPhase]
        } at ${phaseChangeTime.toISOString()}`,
      );
    } catch (error) {
      Logger.error("SCHEDULER", "Error scheduling phase announcement", error);
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
        title = "Entry Phase started";
        description =
          "The housing lottery entry phase has started!\nYou can now place bids on available plots.\n\nUse `/paissa` to check available plots on your world.\n\nThe entry phase typically lasts 5 days, but may vary due to maintenance or events.";
      } else if (phase === LottoPhase.RESULTS) {
        title = "Results Phase started";
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
