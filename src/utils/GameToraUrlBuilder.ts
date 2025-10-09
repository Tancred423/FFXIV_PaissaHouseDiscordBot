import { DistrictId } from "../types/ApiEnums.ts";

export class GameToraUrlBuilder {
  static #getDistrictPath(districtId: number): string {
    switch (districtId) {
      case DistrictId.MIST:
        return "mist";
      case DistrictId.THE_LAVENDER_BEDS:
        return "lavender-beds";
      case DistrictId.THE_GOBLET:
        return "goblet";
      case DistrictId.SHIROGANE:
        return "shirogane";
      case DistrictId.EMPYREUM:
        return "empyreum";
      default:
        throw Error(`Unknown district ID: ${districtId}`);
    }
  }

  static buildPlotUrl(districtId: number, plotNumber: number): string {
    const districtPath = this.#getDistrictPath(districtId);
    const urlPlotNumber = plotNumber > 30 ? plotNumber - 30 : plotNumber;
    const formattedPlotNumber = urlPlotNumber.toString().padStart(2, "0");
    return `https://gametora.com/ffxiv/housing-plot-viewer/${districtPath}?plot=${formattedPlotNumber}`;
  }
}
