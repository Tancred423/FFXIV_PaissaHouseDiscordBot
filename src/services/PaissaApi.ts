const API_BASE_URL = "https://paissadb.zhu.codes";

export interface OpenPlotDetail {
  world_id: number;
  district_id: number;
  ward_number: number;
  plot_number: number;
  size: number;
  price: number;
  last_updated_time: number;
  first_seen_time: number;
  est_time_open_min: number;
  est_time_open_max: number;
  purchase_system: number;
  lotto_entries?: number;
  lotto_phase?: number;
  lotto_phase_until?: number;
}

export interface DistrictDetail {
  id: number;
  name: string;
  num_open_plots: number;
  oldest_plot_time: number;
  open_plots: OpenPlotDetail[];
}

export interface WorldDetail {
  id: number;
  name: string;
  districts: DistrictDetail[];
  num_open_plots: number;
  oldest_plot_time: number;
}

export class PaissaApiService {
  static async fetchWorldDetail(worldId: number): Promise<WorldDetail> {
    const response = await fetch(`${API_BASE_URL}/worlds/${worldId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch world detail: ${response.statusText}`);
    }
    return await response.json();
  }
}
