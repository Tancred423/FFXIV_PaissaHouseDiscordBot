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
