import { LotteryPhase } from "../types/LotteryPhase.ts";
import { OpenPlotDetail, WorldDetail } from "../types/ApiTypes.ts";
import { WorldDataHelper } from "./WorldDataHelper.ts";
import { PaissaApiService } from "../services/PaissaApiService.ts";
import { LottoPhase } from "../types/ApiEnums.ts";

export class LotteryPhaseHelper {
  static async getCurrentOrLatestLotteryPhase(
    worldDetail: WorldDetail | null = null,
  ): Promise<LotteryPhase | null> {
    if (!worldDetail) {
      const worldId = WorldDataHelper.getDefaultWorldId();
      worldDetail = await PaissaApiService.fetchWorldDetail(worldId);
    }
    const plotWithNextOrLatestPhaseChange = this
      .getPlotWithNextOrLatestPhaseChange(worldDetail);
    const phase = plotWithNextOrLatestPhaseChange?.lotto_phase ?? null;
    const phaseName = phase ? this.getPhaseName(phase) : null;
    const until = plotWithNextOrLatestPhaseChange?.lotto_phase_until ?? null;
    const isCurrent = until ? (until > (Date.now() / 1000)) : false;

    if (!phase || !phaseName || !until) {
      return null;
    }

    return {
      phase: phase,
      phaseName: phaseName,
      until: until,
      isCurrent: isCurrent,
    };
  }

  private static getPlotWithNextOrLatestPhaseChange(
    worldDetail: WorldDetail,
  ): OpenPlotDetail | null {
    const now = Date.now() / 1000;
    const allPlots = worldDetail.districts.flatMap((district) =>
      district.open_plots
    );
    const plotsSortedByPhaseChangeTimes = allPlots
      .filter((plot) => (plot.lotto_phase_until ?? 0) > 0)
      .filter((plot) =>
        [LottoPhase.ENTRY, LottoPhase.RESULTS].includes(plot.lotto_phase ?? 0)
      )
      .sort((a, b) => (a.lotto_phase_until ?? 0) - (b.lotto_phase_until ?? 0));

    const plotWithNextPhaseChange = plotsSortedByPhaseChangeTimes.find((plot) =>
      (plot.lotto_phase_until ?? 0) > now
    );
    if (plotWithNextPhaseChange) {
      return plotWithNextPhaseChange;
    }

    return plotsSortedByPhaseChangeTimes[
      plotsSortedByPhaseChangeTimes.length - 1
    ] ?? null;
  }

  private static getPhaseName(phase: number): string {
    switch (phase) {
      case LottoPhase.ENTRY:
        return "Entry phase";
      case LottoPhase.RESULTS:
        return "Results phase";
      default:
        return "Phase";
    }
  }
}
