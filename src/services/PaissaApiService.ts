import { WorldDetail } from "../types/ApiTypes.ts";
import { logger } from "../utils/Logger.ts";

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
      logger.error(
        "API",
        `Failed to fetch world ${worldId}: ${response.status} - ${response.statusText}`,
      );
      throw new Error(`Failed to fetch world detail: ${response.statusText}`);
    }
    logger.info("API", `API request successful for world ID ${worldId}`);
    return await response.json();
  }
}
