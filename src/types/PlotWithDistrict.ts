import { OpenPlotDetail } from "../services/PaissaApi.ts";

export interface PlotWithDistrict extends OpenPlotDetail {
  districtId: number;
  districtName: string;
}
