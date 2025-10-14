import { LottoPhase, PurchaseSystem } from "../types/ApiEnums.ts";

interface PlotLike {
  purchase_system: number;
  lotto_phase?: number | null;
  lotto_phase_until?: number | null;
}

export class PlotValidationService {
  static isLottery(plot: PlotLike): boolean {
    return (plot.purchase_system & PurchaseSystem.LOTTERY) !== 0;
  }

  static isOutdatedPhase(plot: PlotLike): boolean {
    const timeSecs = +new Date() / 1000;
    return this.isLottery(plot) && (plot.lotto_phase_until ?? 0) < timeSecs;
  }

  static isEntryPhase(plot: PlotLike): boolean {
    return this.isLottery(plot) && !this.isOutdatedPhase(plot) &&
      plot.lotto_phase === LottoPhase.ENTRY;
  }

  static isUnknownOrOutdatedPhase(plot: PlotLike): boolean {
    return this.isLottery(plot) &&
      (plot.lotto_phase === null || this.isOutdatedPhase(plot));
  }
}
