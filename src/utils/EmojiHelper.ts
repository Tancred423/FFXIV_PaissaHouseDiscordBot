import { EmojiName } from "../types/EmojiName.ts";
import { logger } from "./Logger.ts";

export class EmojiHelper {
  static get(name: EmojiName): string {
    const nameStr = EmojiName[name];
    const emote = Deno.env.get(nameStr);

    if (!emote) {
      logger.error("SYSTEM", `Missing emoji with name ${name.toString()}`);
    }

    return emote ?? "";
  }
}
