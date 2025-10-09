import { PlotWithDistrict } from "../types/PlotWithDistrict.ts";
import { HouseSize, LottoPhase, PurchaseSystem } from "../types/ApiEnums.ts";
import { PlotValidationService } from "../services/PlotValidationService.ts";
import { GameToraUrlBuilder } from "./GameToraUrlBuilder.ts";
import { EmojiHelper } from "./EmojiHelper.ts";
import { EmojiName } from "../types/EmojiName.ts";

export class TextOutputBuilder {
  static getAllowedTenantsText(plot: PlotWithDistrict): string {
    const purchaseSystem = plot.purchase_system;

    if (
      (purchaseSystem &
        (PurchaseSystem.FREE_COMPANY | PurchaseSystem.INDIVIDUAL)) ==
        (PurchaseSystem.FREE_COMPANY | PurchaseSystem.INDIVIDUAL)
    ) {
      return EmojiHelper.get(
        EmojiName.EMOJI_ALLOWED_TENANTS_UNRESTRICTED,
      ) + " Unrestricted";
    }

    if (purchaseSystem & PurchaseSystem.FREE_COMPANY) {
      return EmojiHelper.get(
        EmojiName.EMOJI_ALLOWED_TENANTS_FREE_COMPANY,
      ) + " Free Company";
    }

    return EmojiHelper.get(EmojiName.EMOJI_ALLOWED_TENANTS_INDIVIDUAL) +
      " Individual";
  }

  static getDistrictText(
    districtFilter: number | null,
    plot: PlotWithDistrict,
  ): string {
    return districtFilter !== null
      ? ""
      : EmojiHelper.get(EmojiName.EMOJI_AETHERYTE) + " " + plot.districtName;
  }

  static getEntriesText(plot: PlotWithDistrict): string {
    const emote = EmojiHelper.get(EmojiName.EMOJI_ENTRIES) + " ";

    if (!PlotValidationService.isLottery(plot)) {
      return emote + "N/A";
    }

    if (
      plot.lotto_phase === null || PlotValidationService.isOutdatedPhase(plot)
    ) {
      return emote + "_Missing Pl. Data_";
    }

    return emote + (plot.lotto_entries?.toString() ?? "0");
  }

  static getFieldNameText(plot: PlotWithDistrict): string {
    return `Plot ${plot.plot_number + 1} (Ward ${plot.ward_number + 1})`;
  }

  static getGameToraLinkText(plot: PlotWithDistrict): string {
    const plotUrl = GameToraUrlBuilder.buildPlotUrl(
      plot.districtId,
      plot.plot_number + 1,
    );
    const emote = EmojiHelper.get(EmojiName.EMOJI_GAMETORA);
    return `[${emote} View plot](${plotUrl})`;
  }

  static getLastUpdatedText(plot: PlotWithDistrict): string {
    return EmojiHelper.get(EmojiName.EMOJI_LAST_UPDATED) +
      ` <t:${Math.floor(plot.last_updated_time)}:R>`;
  }

  static getLotteryPhaseText(plot: PlotWithDistrict): string {
    if (!PlotValidationService.isLottery(plot)) {
      return EmojiHelper.get(EmojiName.EMOJI_FCFS) + " FCFS";
    }

    if (
      plot.lotto_phase === null || PlotValidationService.isOutdatedPhase(plot)
    ) {
      return EmojiHelper.get(EmojiName.EMOJI_PHASE_MISSING_PLACARD_DATA) +
        " _Missing Pl. Data_";
    }

    switch (plot.lotto_phase) {
      case LottoPhase.ENTRY:
        return EmojiHelper.get(EmojiName.EMOJI_PHASE_ACCEPTING_ENTRIES) +
          " Accepting Entries";
      case LottoPhase.RESULTS:
        return EmojiHelper.get(EmojiName.EMOJI_PHASE_RESULTS) + " Results";
      case LottoPhase.UNAVAILABLE:
        return EmojiHelper.get(EmojiName.EMOJI_PHASE_UNAVAILABLE) +
          " Unavailable";
      default:
        return EmojiHelper.get(EmojiName.EMOJI_PHASE_MISSING_PLACARD_DATA) +
          ` Unknown (${plot.lotto_phase})`;
    }
  }

  static getPriceText(plot: PlotWithDistrict): string {
    return EmojiHelper.get(EmojiName.EMOJI_GIL) + " " +
      new Intl.NumberFormat("en-US").format(plot.price);
  }

  static getSizeText(size: number): string {
    switch (size) {
      case HouseSize.SMALL:
        return EmojiHelper.get(EmojiName.EMOJI_SMALL) + " Small";
      case HouseSize.MEDIUM:
        return EmojiHelper.get(EmojiName.EMOJI_MEDIUM) + " Medium";
      case HouseSize.LARGE:
        return EmojiHelper.get(EmojiName.EMOJI_LARGE) + " Large";
      default:
        throw Error("Invalid size");
    }
  }
}
