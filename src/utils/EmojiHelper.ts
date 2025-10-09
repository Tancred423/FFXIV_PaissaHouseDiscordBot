import { EmojiName } from "../types/EmojiName.ts";

export class EmojiHelper {
  static get(name: EmojiName): string {
    const nameStr = EmojiName[name];
    const emote = Deno.env.get(nameStr);

    if (!emote) {
      console.error("Missing emoji with name " + name.toString());
    }

    return emote ?? "";
  }
}
