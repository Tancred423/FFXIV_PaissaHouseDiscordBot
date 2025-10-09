import { OpenPlotDetail } from "./ApiTypes.ts";

export interface PlotWithDistrict extends OpenPlotDetail {
  districtId: number;
  districtName: string;
}
