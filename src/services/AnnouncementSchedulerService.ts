import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { DatabaseService } from "../services/DatabaseService.ts";
import { PaissaApiService } from "../services/PaissaApiService.ts";
import { WorldDataHelper } from "../utils/WorldDataHelper.ts";
import { ColorHelper } from "../utils/ColorHelper.ts";
import { LottoPhase } from "../types/ApiEnums.ts";
import { PlotValidationService } from "../services/PlotValidationService.ts";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PHASE_TRANSITION_WINDOW_MS = 60 * 60 * 1000;

export class AnnouncementSchedulerService {
  private client: Client;
  private lastPhaseEndTime = 0;
  private lastPhase: LottoPhase | null = null;
  private intervalId?: number;
  private cleanupIntervalId?: number;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    console.log("Starting announcement scheduler service...");
    this.check();
    this.intervalId = setInterval(() => this.check(), CHECK_INTERVAL_MS);

    this.cleanupDeadData();
    this.cleanupIntervalId = setInterval(
      () => this.cleanupDeadData(),
      CLEANUP_INTERVAL_MS,
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  private async check(): Promise<void> {
    try {
      console.log("Checking for phase change...");
      const phaseInfo = await this.detectPhaseChange();

      if (phaseInfo.changed) {
        await this.sendAnnouncements(phaseInfo.phase);
      }
    } catch (error) {
      console.error("Error in announcement scheduler:", error);
    }
  }

  private async detectPhaseChange(): Promise<{
    changed: boolean;
    phase: LottoPhase | null;
  }> {
    try {
      const allWorlds = WorldDataHelper.getAllWorlds();
      const now = Date.now() / 1000;

      const world = allWorlds[0];
      const worldDetail = await PaissaApiService.fetchWorldDetail(world.id);

      const allPlots = worldDetail.districts.flatMap((district) =>
        district.open_plots
      );

      const lotteryPlots = allPlots.filter((plot) => {
        if (!PlotValidationService.isLottery(plot)) return false;
        if (PlotValidationService.isUnknownOrOutdatedPhase(plot)) return false;
        return true;
      });

      if (lotteryPlots.length === 0) {
        return { changed: false, phase: null };
      }

      const firstPlot = lotteryPlots[0];
      const currentPhase = firstPlot.lotto_phase;
      const currentPhaseEndTime = firstPlot.lotto_phase_until ?? 0;

      if (currentPhaseEndTime === 0) {
        return { changed: false, phase: null };
      }

      if (this.lastPhaseEndTime === 0) {
        this.lastPhaseEndTime = currentPhaseEndTime;
        this.lastPhase = currentPhase ?? null;
        return { changed: false, phase: null };
      }

      const phaseEndTimeChanged = Math.abs(
        currentPhaseEndTime - this.lastPhaseEndTime,
      ) > 60;
      const phaseTypeChanged = currentPhase !== this.lastPhase;

      if (phaseEndTimeChanged && phaseTypeChanged) {
        const timeSincePhaseChange = now - (this.lastPhaseEndTime);
        const isWithinAnnouncementWindow = timeSincePhaseChange >= 0 &&
          timeSincePhaseChange < PHASE_TRANSITION_WINDOW_MS / 1000;

        if (isWithinAnnouncementWindow) {
          console.log(
            `Phase change detected! Previous: ${this.lastPhase}, Current: ${currentPhase}`,
          );
          this.lastPhaseEndTime = currentPhaseEndTime;
          this.lastPhase = currentPhase ?? null;
          return { changed: true, phase: currentPhase ?? null };
        }
      }

      this.lastPhaseEndTime = currentPhaseEndTime;
      this.lastPhase = currentPhase ?? null;

      return { changed: false, phase: null };
    } catch (error) {
      console.error("Error in detectPhaseChange:", error);
      return { changed: false, phase: null };
    }
  }

  private async sendAnnouncements(phase: LottoPhase | null): Promise<void> {
    if (phase === null) return;

    try {
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
        return;
      }

      for (const settings of guildSettings) {
        try {
          const channel = await this.client.channels.fetch(
            settings.announcementChannelId,
          );

          if (!channel || !(channel instanceof TextChannel)) {
            console.warn(
              `Channel ${settings.announcementChannelId} not found or not a text channel`,
            );
            continue;
          }

          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setThumbnail("https://zhu.codes/assets/PaissaLogo.c38c9420.png")
            .setColor(ColorHelper.getEmbedColor());

          await channel.send({ embeds: [embed] });
          console.log(
            `Sent ${
              phase === LottoPhase.ENTRY ? "ENTRY" : "RESULTS"
            } announcement to guild ${settings.guildId}, channel ${settings.announcementChannelId}`,
          );
        } catch (error) {
          console.error(
            `Error sending announcement to guild ${settings.guildId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Error in sendAnnouncements:", error);
    }
  }

  private async cleanupDeadData(): Promise<void> {
    try {
      console.log("Running periodic cleanup of dead guild/channel data...");
      const guildSettings = DatabaseService.getAllGuildSettings();
      let cleanedCount = 0;

      for (const settings of guildSettings) {
        try {
          const guild = await this.client.guilds.fetch(settings.guildId);
          if (!guild) {
            DatabaseService.removeAnnouncementChannel(settings.guildId);
            cleanedCount++;
            console.log(
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
            console.log(
              `Cleaned up settings for non-existent channel ${settings.announcementChannelId} in guild ${settings.guildId}`,
            );
          }
        } catch (error) {
          console.error(
            `Failed to check or execute cleanup for guild ${settings.guildId}`,
            error,
          );
        }
      }

      console.log(
        `Cleanup completed. Removed ${cleanedCount} dead entries out of ${guildSettings.length} total.`,
      );
    } catch (error) {
      console.error("Error in cleanupDeadData:", error);
    }
  }
}
