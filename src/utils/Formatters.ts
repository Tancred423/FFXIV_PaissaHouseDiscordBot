import { HousingUtils } from "./HousingUtils.ts";
import { PlotWithDistrict } from "../types/PlotWithDistrict.ts";

export class Formatters {
  static getAllowedTenantsText(plot: PlotWithDistrict): string {
    switch (plot.purchase_system) {
      case 3:
        // Website says 2, Documentation says 1, but API returns 3 -> To be confirmed
        return "<:AllowedTenantsFreeCompany:1425543494784516096> Free Company";
      case 5:
        // Website says 4, Documentation says 2, but API returns 5 -> To be confirmed
        return "<:AllowedTenantsIndividual:1425543456553570324> Individual";
      case 7:
        // Website says 2 and 4, Documentation says 4, but API returns 7 -> To be confirmed
        return "<:AllowedTenantsUnrestricted:1425543522840346755> Unrestricted";
      default:
        throw Error("Invalid allowed tenants");
    }
  }

  static getDistrictText(
    districtFilter: number | null,
    plot: PlotWithDistrict,
  ): string {
    return districtFilter !== null
      ? ""
      : "<:Aetheryte:1425463239587663943> " + plot.districtName;
  }

  static getEntriesText(plot: PlotWithDistrict): string {
    const emote = "<:Entries:1425536121382768683> ";
    const entries = plot.lotto_entries;
    return entries ? emote + entries : emote + "_Missing Pl. Data_";
  }

  static getFieldNameText(plot: PlotWithDistrict): string {
    return `Plot ${plot.plot_number + 1} (Ward ${plot.ward_number + 1})`;
  }

  static getGameToraLinkText(plot: PlotWithDistrict): string {
    const plotUrl = HousingUtils.getPlotUrl(
      plot.districtId,
      plot.plot_number + 1,
    );
    return `[<:GameTora:1425439689166426142> View plot](${plotUrl})`;
  }

  static getLastUpdatedText(plot: PlotWithDistrict): string {
    return "<:LastUpdated:1425545566514843668>" +
      `<t:${Math.floor(plot.last_updated_time)}:R>`;
  }

  static getLotteryPhaseText(plot: PlotWithDistrict): string {
    switch (plot.lotto_phase) {
      case null:
        // Website says -1, Documentation says None, but API returns null -> To be confirmed
        return "<:PhaseMissingPlacardData:1425540907918430260> _Missing Pl. Data_";
      case -2:
        // Website says -2, Documentation says None, but API returns nothing as it doesn't exist anymore -> To be confirmed
        return "<:FCFS:1425550787798372362> FCFS";
      case 1:
        // Sometimes website says Missing Placard Data, but API returns 1 (Accepting Entries) -> To be confirmed
        return "<:PhaseAcceptingEntries:1425546895371145358> Accepting Entries";
      case 2:
        return "<:PhaseResults:1425540763663470662> Results";
      case 3:
        return "<:PhaseUnavailable:1425541045336281189> Unavailable";
      default:
        throw Error("Invalid phase");
    }
  }

  static getPriceText(plot: PlotWithDistrict): string {
    return "<:Gil:1425433496762974271> " +
      new Intl.NumberFormat("en-US").format(plot.price);
  }

  static getSizeText(size: number): string {
    switch (size) {
      case 0:
        return "<:Small:1425438039819161621> Small";
      case 1:
        return "<:Medium:1425438053522079836> Medium";
      case 2:
        return "<:Large:1425438064523612300> Large";
      default:
        throw Error("Invalid size");
    }
  }
}
