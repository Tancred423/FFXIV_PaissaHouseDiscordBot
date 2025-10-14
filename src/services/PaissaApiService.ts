import { WorldDetail } from "../types/ApiTypes.ts";

const API_BASE_URL = "https://paissadb.zhu.codes";

export class PaissaApiService {
  static async fetchWorldDetail(worldId: number): Promise<WorldDetail> {
    const response = await fetch(`${API_BASE_URL}/worlds/${worldId}`, {
      headers: {
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
    console.log(`API request successful for world ID ${worldId}.`);
    return await response.json();
  }
}
