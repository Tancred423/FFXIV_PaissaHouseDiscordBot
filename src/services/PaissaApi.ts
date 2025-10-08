import { create } from "djwt";

const API_BASE_URL = "https://paissadb.zhu.codes";

const JWT_SECRET = Deno.env.get("PAISSA_JWT_SECRET") || "";
const CHARACTER_ID = parseInt(Deno.env.get("PAISSA_CHARACTER_ID") || "0");

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
    const token = await this.generateJWT();

    const response = await fetch(`${API_BASE_URL}/worlds/${worldId}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent":
          "PaissaHouse-Discord-Bot/1.0 (https://github.com/Tancred423/FFXIV_PaissaHouseDiscordBot)",
        "Accept": "application/json",
        "Referer": "https://github.com/Tancred423/FFXIV_PaissaHouseDiscordBot",
      },
    });
    if (!response.ok) {
      console.error(
        `API request failed with status: ${response.status} - ${response.statusText}`,
      );
      throw new Error(`Failed to fetch world detail: ${response.statusText}`);
    }
    return await response.json();
  }

  private static async generateJWT(): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const payload = {
      cid: CHARACTER_ID,
      iss: "PaissaDB",
      aud: "PaissaHouse",
      iat: Math.floor(Date.now() / 1000),
    };
    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      payload,
      key,
    );
    return jwt;
  }
}
