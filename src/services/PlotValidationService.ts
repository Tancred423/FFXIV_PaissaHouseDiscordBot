import { LottoPhase, PurchaseSystem } from "../types/ApiEnums.ts";
import { PlotWithDistrict } from "../types/PlotWithDistrict.ts";

export class PlotValidationService {
  static isLottery(plot: PlotWithDistrict): boolean {
    return (plot.purchase_system & PurchaseSystem.LOTTERY) !== 0;
  }

  static isOutdatedPhase(plot: PlotWithDistrict): boolean {
    const timeSecs = +new Date() / 1000;
    return this.isLottery(plot) && (plot.lotto_phase_until ?? 0) < timeSecs;
  }

  static isEntryPhase(plot: PlotWithDistrict): boolean {
    return this.isLottery(plot) && !this.isOutdatedPhase(plot) &&
      plot.lotto_phase === LottoPhase.ENTRY;
  }

  static isUnknownOrOutdatedPhase(plot: PlotWithDistrict): boolean {
    return this.isLottery(plot) &&
      (plot.lotto_phase === null || this.isOutdatedPhase(plot));
  }
}
