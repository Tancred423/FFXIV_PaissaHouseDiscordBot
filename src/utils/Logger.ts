type LogLevel = "INFO" | "WARN" | "ERROR";
type LogCategory =
  | "STARTUP"
  | "API"
  | "COMMAND"
  | "SCHEDULER"
  | "CLEANUP"
  | "SYSTEM"
  | "PRESENCE"
  | "CACHE"
  | "DATABASE";

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: COLORS.green,
  WARN: COLORS.yellow,
  ERROR: COLORS.red,
};

const CATEGORY_COLORS: Record<LogCategory, string> = {
  STARTUP: COLORS.bright + COLORS.magenta,
  API: COLORS.blue,
  COMMAND: COLORS.cyan,
  SCHEDULER: COLORS.yellow,
  CLEANUP: COLORS.magenta,
  SYSTEM: COLORS.white,
  PRESENCE: COLORS.green,
  CACHE: COLORS.bright + COLORS.blue,
  DATABASE: COLORS.bright + COLORS.cyan,
};

export class Logger {
  private static timezone: string = "UTC";

  static setTimezone(timezone: string): void {
    this.timezone = timezone;
  }

  static getTimezone(): string {
    return this.timezone;
  }

  private static formatTimestamp(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "shortOffset",
    });

    const parts = formatter.formatToParts(now);
    const partsMap = Object.fromEntries(
      parts.map((p) => [p.type, p.value]),
    );

    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    return `${partsMap.year}-${partsMap.month}-${partsMap.day} ${partsMap.hour}:${partsMap.minute}:${partsMap.second}.${milliseconds} ${partsMap.timeZoneName}`;
  }

  private static formatMessage(
    level: LogLevel,
    category: LogCategory,
    message: string,
    ...args: unknown[]
  ): string {
    const parts: string[] = [];

    const timestamp = `${COLORS.dim}${this.formatTimestamp()}${COLORS.reset}`;
    parts.push(`[${timestamp}]`);

    const levelWithBraces = `[${level}]`;
    parts.push(
      `${LEVEL_COLORS[level]}${levelWithBraces.padEnd(7)}${COLORS.reset}`,
    );

    const categorywithBraces = `[${category}]`;
    parts.push(
      `${CATEGORY_COLORS[category]}${
        categorywithBraces.padEnd(11)
      }${COLORS.reset}`,
    );

    parts.push(message);

    let formatted = parts.join(" ");

    if (args.length > 0) {
      const formattedArgs = args.map((arg) => {
        if (arg instanceof Error) {
          return `\n${arg.stack || arg.message}`;
        }
        if (typeof arg === "object") {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(" ");
      formatted += " " + formattedArgs;
    }

    return formatted;
  }

  static info(
    category: LogCategory,
    message: string,
    ...args: unknown[]
  ): void {
    console.log(this.formatMessage("INFO", category, message, ...args));
  }

  static warn(
    category: LogCategory,
    message: string,
    ...args: unknown[]
  ): void {
    console.warn(this.formatMessage("WARN", category, message, ...args));
  }

  static error(
    category: LogCategory,
    message: string,
    ...args: unknown[]
  ): void {
    console.error(this.formatMessage("ERROR", category, message, ...args));
  }
}
