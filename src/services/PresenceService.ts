import { ActivityType, Client } from "discord.js";
import { LottoPhase } from "../types/ApiEnums.ts";
import { WorldDataHelper } from "../utils/WorldDataHelper.ts";
import { PaissaApiService } from "./PaissaApiService.ts";
import { PlotValidationService } from "./PlotValidationService.ts";
import { Logger } from "../utils/Logger.ts";
import { OpenPlotDetail } from "../types/ApiTypes.ts";

export class PresenceService {
  client: Client;
  defaultPresenceText: string = "/help, /paissa, /announcement";

  constructor(client: Client) {
    this.client = client;
  }

  async updatePresence(): Promise<void> {
    try {
      const plots = await this.getPlotsWithValidPhase();

      if (plots.length === 0) {
        this.setDefaultPresence();
        return;
      }

      const plotWithFuturePhaseEndTime = this
        .getFirstPlotWithFuturePhaseEndTime(plots);
      const currentPhase = plotWithFuturePhaseEndTime.lotto_phase ?? null;
      const currentPhaseEndTime =
        plotWithFuturePhaseEndTime.lotto_phase_until ?? 0;

      this.setPhasePresence(currentPhase, currentPhaseEndTime);
    } catch (error) {
      Logger.error("PRESENCE", "Failed to update presence", error);
      this.client.user?.setPresence({
        activities: [{
          name: "/help, /paissa, /announcement",
          type: ActivityType.Custom,
        }],
        status: "online",
      });
    }
  }

  private getFirstPlotWithFuturePhaseEndTime(
    plots: OpenPlotDetail[],
  ): OpenPlotDetail {
    const now = Date.now() / 1000;
    const validPlots = plots.filter((plot) => {
      const phaseEndTime = plot.lotto_phase_until ?? 0;
      return phaseEndTime > now;
    });

    return validPlots.length > 0 ? validPlots[0] : plots[0];
  }

  private async getPlotsWithValidPhase(): Promise<OpenPlotDetail[]> {
    const allWorlds = WorldDataHelper.getAllWorlds();
    const world = allWorlds[0];
    const worldDetail = await PaissaApiService.fetchWorldDetail(world.id);

    const allPlots = worldDetail.districts.flatMap((district) =>
      district.open_plots
    );

    const lotteryPlots = allPlots.filter((plot) => {
      if (!PlotValidationService.isLottery(plot)) return false;
      if (PlotValidationService.isUnknownOrOutdatedPhase(plot)) return false;
      if (
        plot.lotto_phase !== LottoPhase.ENTRY &&
        plot.lotto_phase !== LottoPhase.RESULTS
      ) return false;
      return true;
    });

    return lotteryPlots;
  }

  private setDefaultPresence(): void {
    this.client.user?.setPresence({
      activities: [{
        name: this.defaultPresenceText,
        type: ActivityType.Custom,
      }],
      status: "online",
    });

    Logger.info("PRESENCE", "Presence updated to default (no lottery data)");
  }

  private setPhasePresence(
    currentPhase: number | null,
    currentPhaseEndTime: number,
  ): void {
    const presenceName = currentPhase !== null && currentPhaseEndTime > 0
      ? this.formatTimeUntil(currentPhaseEndTime, currentPhase)
      : this.defaultPresenceText;

    this.client.user?.setPresence({
      activities: [{
        name: presenceName,
        type: ActivityType.Custom,
      }],
      status: "online",
    });
    Logger.info("PRESENCE", "Presence updated successfully");
  }

  private formatTimeUntil(
    targetTime: number,
    phase: LottoPhase | null,
  ): string {
    const now = Date.now() / 1000;
    const diff = targetTime - now;

    if (diff <= 0) {
      return "Phase ended";
    }

    const hours = Math.floor(diff / 3600);

    let phaseName = "Phase";
    if (phase === LottoPhase.ENTRY) {
      phaseName = "Entry phase";
    } else if (phase === LottoPhase.RESULTS) {
      phaseName = "Results phase";
    }

    return hours < 1
      ? `${phaseName} ends in < 1h`
      : `${phaseName} ends in ${hours}h`;
  }
}
