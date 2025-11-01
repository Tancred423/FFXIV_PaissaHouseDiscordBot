import { ActivityType, Client } from "discord.js";
import { Logger } from "../utils/Logger.ts";
import { LotteryPhase } from "../types/LotteryPhase.ts";
import { LotteryPhaseHelper } from "../utils/LotteryPhaseHelper.ts";

export class PresenceService {
  client: Client;
  defaultPresenceText: string = "/help, /paissa, /announcement";

  constructor(client: Client) {
    this.client = client;
  }

  async updatePresence(): Promise<void> {
    try {
      const currentOrLatestPhase = await LotteryPhaseHelper
        .getCurrentOrLatestLotteryPhase();

      if (!currentOrLatestPhase) {
        this.setDefaultPresence();
        return;
      }

      this.setPhasePresence(currentOrLatestPhase);
      Logger.info("PRESENCE", "Presence updated successfully");
    } catch (error) {
      Logger.error("PRESENCE", "Failed to update presence", error);
    }
  }

  private setDefaultPresence(): void {
    this.client.user?.setPresence({
      activities: [{
        name: this.defaultPresenceText,
        type: ActivityType.Custom,
      }],
      status: "online",
    });

    Logger.info("PRESENCE", "Presence updated to default (no lottery data)");
  }

  private setPhasePresence(currentOrLatestPhase: LotteryPhase): void {
    const presenceName = this.formatTimeUntil(currentOrLatestPhase);

    this.client.user?.setPresence({
      activities: [{
        name: presenceName,
        type: ActivityType.Custom,
      }],
      status: "online",
    });
  }

  private formatTimeUntil(currentOrLatestPhase: LotteryPhase): string {
    const now = Date.now() / 1000;
    const diffInSeconds = currentOrLatestPhase.until - now;
    const timeString = this.buildTimeString(diffInSeconds);

    if (!currentOrLatestPhase.isCurrent) {
      return currentOrLatestPhase.phaseName + " ended " + timeString + " ago";
    }

    return currentOrLatestPhase.phaseName + " ends in " + timeString;
  }

  private buildTimeString(totalSeconds: number): string {
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    if (days > 0) {
      const remainingSeconds = totalSeconds - (days * 60 * 60 * 24);
      const hours = Math.floor(remainingSeconds / (60 * 60));
      const dayText = `${days} ${days === 1 ? "day" : "days"}`;

      if (hours > 0) {
        const hourText = `${hours} ${hours === 1 ? "hour" : "hours"}`;
        return `${dayText}, ${hourText}`;
      }

      return dayText;
    }

    const hours = Math.floor(totalSeconds / (60 * 60));
    if (hours > 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }

    return "< 1 hour";
  }
}
