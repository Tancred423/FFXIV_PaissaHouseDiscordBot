import { WorldDetail } from "../types/ApiTypes.ts";
import { Logger } from "../utils/Logger.ts";
import { CacheService } from "./CacheService.ts";

const API_BASE_URL = "https://paissadb.zhu.codes";
const CACHE_TTL_MS = 15 * 60 * 1000;

export class PaissaApiService {
  static async fetchWorldDetail(worldId: number): Promise<WorldDetail> {
    const cacheKey = `world_${worldId}`;

    const cachedData = CacheService.get<WorldDetail>(cacheKey, CACHE_TTL_MS);
    if (cachedData) {
      return cachedData;
    }

    const response = await fetch(`${API_BASE_URL}/worlds/${worldId}`, {
      headers: {
        "User-Agent":
          "PaissaHouse-Discord-Bot/1.0 (https://github.com/Tancred423/FFXIV_PaissaHouseDiscordBot)",
        "Accept": "application/json",
        "Referer": "https://github.com/Tancred423/FFXIV_PaissaHouseDiscordBot",
      },
    });

    if (!response.ok) {
      Logger.error(
        "API",
        `Failed to fetch world ${worldId}: ${response.status} - ${response.statusText}`,
      );
      throw new Error(`Failed to fetch world detail: ${response.statusText}`);
    }

    Logger.info("API", `API request successful for world ID ${worldId}`);
    const data = await response.json();

    CacheService.set(cacheKey, data);
    return data;
  }
}
