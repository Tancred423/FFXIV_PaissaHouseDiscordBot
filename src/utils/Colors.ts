export class ColorHelper {
  static getEmbedColor(): number {
    const colorString = Deno.env.get("EMBED_COLOR")!;

    if (colorString.startsWith("0x")) {
      return parseInt(colorString, 16);
    }

    if (colorString.startsWith("#")) {
      return parseInt(colorString.slice(1), 16);
    }

    return parseInt(colorString, 10);
  }
}
