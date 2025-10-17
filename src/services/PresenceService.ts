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
    const diff = currentOrLatestPhase.until - now;
    const minutes = Math.floor(Math.abs(diff) / 60);
    const timeString = this.buildTimeString(minutes);

    if (!currentOrLatestPhase.isCurrent) {
      return currentOrLatestPhase.phaseName + " ended " + timeString + " ago";
    }

    return currentOrLatestPhase.phaseName + " ends in " + timeString;
  }

  private buildTimeString(totalMinutes: number): string {
    if (totalMinutes === 0) {
      return "< 1 minute";
    }

    const days = Math.floor(totalMinutes / (60 * 24));
    if (days > 0) {
      return `${days} ${days === 1 ? "day" : "days"}`;
    }

    const hours = Math.floor(totalMinutes / 60);
    if (hours > 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }

    return `${totalMinutes} ${totalMinutes === 1 ? "minute" : "minutes"}`;
  }
}
