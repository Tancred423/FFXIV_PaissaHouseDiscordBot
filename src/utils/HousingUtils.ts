export class HousingUtils {
  static #getDistrictPath(districtId: number): string {
    switch (districtId) {
      case 339:
        return "mist";
      case 340:
        return "lavender-beds";
      case 341:
        return "goblet";
      case 641:
        return "shirogane";
      case 979:
        return "empyreum";
      default:
        throw Error(`Unknown district ID: ${districtId}`);
    }
  }

  static getPlotUrl(districtId: number, plotNumber: number): string {
    const districtPath = this.#getDistrictPath(districtId);
    const urlPlotNumber = plotNumber > 30 ? plotNumber - 30 : plotNumber;
    const formattedPlotNumber = urlPlotNumber.toString().padStart(2, "0");
    return `https://gametora.com/ffxiv/housing-plot-viewer/${districtPath}?plot=${formattedPlotNumber}`;
  }
}
