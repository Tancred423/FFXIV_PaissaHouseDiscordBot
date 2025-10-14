import {
  ActionRowBuilder,
  APIEmbed,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  EmbedData,
  InteractionCollector,
  JSONEncodable,
  SlashCommandBuilder,
} from "discord.js";
import { ColorHelper } from "../utils/ColorHelper.ts";
import { WorldDataHelper } from "../utils/WorldDataHelper.ts";
import { PaissaApiService } from "../services/PaissaApiService.ts";
import { TextOutputBuilder } from "../utils/TextOutputBuilder.ts";
import { PlotWithDistrict } from "../types/PlotWithDistrict.ts";
import { PaginationState } from "../types/PaginationState.ts";
import {
  DistrictId,
  HouseSize,
  LottoPhase,
  PurchaseSystem,
} from "../types/ApiEnums.ts";
import { PlotValidationService } from "../services/PlotValidationService.ts";
import { WorldDetail } from "../types/ApiTypes.ts";
import { BaseCommand } from "../types/BaseCommand.ts";
import { FilterPhase } from "../types/FilterPhase.ts";
import { PaissaDbUrlBuilder } from "../utils/PaissaDbUrlBuilder.ts";

const PLOTS_PER_PAGE = 9;
const PAGINATION_TIMEOUT_MILLIS = 5 * 60 * 1000;
const paginationStates = new Map<string, PaginationState>();
const activeCollectors = new Map<
  string,
  InteractionCollector<ButtonInteraction<CacheType>>
>();

export class PaissaCommand extends BaseCommand {
  readonly data = this.createPaissaCommandBuilder();

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const worldId = parseInt(interaction.options.getString("world")!);
    const districtIdString = interaction.options.getString("district");
    const districtFilter = districtIdString ? parseInt(districtIdString) : null;
    const sizeString = interaction.options.getString("size");
    const sizeFilter = sizeString ? parseInt(sizeString) : null;
    const lotteryPhaseString = interaction.options.getString("lottery-phase");
    const lotteryPhaseFilter = lotteryPhaseString
      ? parseInt(lotteryPhaseString)
      : null;
    const allowedTenantsString = interaction.options.getString(
      "allowed-tenants",
    );
    const allowedTenantsFilter = allowedTenantsString
      ? parseInt(allowedTenantsString)
      : null;

    await interaction.deferReply();

    const worldDetail = await PaissaApiService.fetchWorldDetail(worldId);
    const { embed, hasPagination, totalPlots } = this.createHousingEmbed(
      worldDetail,
      districtFilter,
      sizeFilter,
      lotteryPhaseFilter,
      allowedTenantsFilter,
      0,
    );

    if (!hasPagination) {
      await interaction.editReply({
        embeds: [embed as JSONEncodable<APIEmbed>],
      });
      return;
    }

    const stateId = `${interaction.user.id}_${interaction.id}_${Date.now()}`;
    const totalPages = Math.ceil(totalPlots / PLOTS_PER_PAGE);

    const allPlots: PlotWithDistrict[] = worldDetail.districts.flatMap((
      district,
    ) =>
      district.open_plots.map((plot) => ({
        ...plot,
        districtId: district.id,
        districtName: district.name,
      }))
    );

    let filteredPlots = allPlots;
    if (districtFilter !== null) {
      filteredPlots = filteredPlots.filter((plot) =>
        plot.districtId === districtFilter
      );
    }
    if (sizeFilter !== null) {
      filteredPlots = filteredPlots.filter((plot) => plot.size === sizeFilter);
    }

    paginationStates.set(stateId, {
      plots: filteredPlots,
      currentPage: 0,
      totalPages,
      worldDetail,
      districtId: districtFilter as number | null,
      sizeFilter,
      lotteryPhaseFilter,
      allowedTenantsFilter,
    });

    const buttons = this.createPaginationButtons(0, totalPages);
    const message = await interaction.editReply({
      embeds: [embed as JSONEncodable<APIEmbed>],
      components: [buttons],
    });

    this.cleanupExpiredStates();
    this.setupPaginationCollector(interaction, stateId, message.id);
  }

  private createPaissaCommandBuilder(): SlashCommandBuilder {
    const paissaBuilder = new SlashCommandBuilder()
      .setName("paissa")
      .setDescription(
        "Get detailed housing information for a specific district and world",
      );

    const datacenters = WorldDataHelper.getDatacenters();
    datacenters.forEach((datacenter) => {
      const worlds = WorldDataHelper.getWorldsByDatacenter(datacenter);

      paissaBuilder.addSubcommand((subcommand) =>
        subcommand
          .setName(datacenter.toLowerCase())
          .setDescription(
            `Get detailed housing information for ${datacenter} datacenter`,
          )
          .addStringOption((option) =>
            option
              .setName("world")
              .setDescription(`World in ${datacenter} datacenter`)
              .setRequired(true)
              .addChoices(...worlds.map((world) => ({
                name: world.name,
                value: world.id.toString(),
              })))
          )
          .addStringOption((option) =>
            option
              .setName("district")
              .setDescription(
                "District to get detailed housing information for",
              )
              .setRequired(false)
              .addChoices(
                { name: "Mist", value: DistrictId.MIST.toString() },
                {
                  name: "The Lavender Beds",
                  value: DistrictId.THE_LAVENDER_BEDS.toString(),
                },
                { name: "The Goblet", value: DistrictId.THE_GOBLET.toString() },
                { name: "Shirogane", value: DistrictId.SHIROGANE.toString() },
                { name: "Empyreum", value: DistrictId.EMPYREUM.toString() },
              )
          )
          .addStringOption((option) =>
            option
              .setName("size")
              .setDescription("Filter by plot size (optional)")
              .setRequired(false)
              .addChoices(
                { name: "Small", value: HouseSize.SMALL.toString() },
                { name: "Medium", value: HouseSize.MEDIUM.toString() },
                { name: "Large", value: HouseSize.LARGE.toString() },
              )
          )
          .addStringOption((option) =>
            option
              .setName("lottery-phase")
              .setDescription("Filter by lottery phase (optional)")
              .setRequired(false)
              .addChoices(
                {
                  name: "Accepting Entries",
                  value: LottoPhase.ENTRY.toString(),
                },
                { name: "Results", value: LottoPhase.RESULTS.toString() },
                {
                  name: "Unavailable",
                  value: LottoPhase.UNAVAILABLE.toString(),
                },
                { name: "FCFS", value: FilterPhase.FCFS.toString() },
                {
                  name: "Missing/Outdated",
                  value: FilterPhase.MISSING_OUTDATED.toString(),
                },
              )
          )
          .addStringOption((option) =>
            option
              .setName("allowed-tenants")
              .setDescription("Filter by allowed tenants (optional)")
              .setRequired(false)
              .addChoices(
                {
                  name: "Free Company",
                  value: PurchaseSystem.FREE_COMPANY.toString(),
                },
                {
                  name: "Individual",
                  value: PurchaseSystem.INDIVIDUAL.toString(),
                },
              )
          )
      );
    });

    return paissaBuilder;
  }

  private getNextOrLatestPhaseChange(worldDetail: WorldDetail): number {
    const now = Date.now() / 1000;
    const allPlots = worldDetail.districts.flatMap((district) =>
      district.open_plots
    );
    const sortedPhaseChangeTimes = allPlots
      .map((plot) => plot.lotto_phase_until ?? 0)
      .filter((time) => time > 0)
      .sort((a, b) => a - b);

    const nextPhaseChange = sortedPhaseChangeTimes.find((time) => time > now);
    if (nextPhaseChange) {
      return nextPhaseChange;
    }
    return sortedPhaseChangeTimes[sortedPhaseChangeTimes.length - 1] ?? 0;
  }

  private createHousingEmbed(
    worldDetail: WorldDetail,
    districtFilter: number | null,
    sizeFilter: number | null,
    lotteryPhaseFilter: number | null,
    allowedTenantsFilter: number | null,
    page: number = 0,
  ): { embed: EmbedBuilder; hasPagination: boolean; totalPlots: number } {
    const allPlots: PlotWithDistrict[] = worldDetail.districts.flatMap((
      district,
    ) =>
      district.open_plots.map((plot) => ({
        ...plot,
        districtId: district.id,
        districtName: district.name,
      }))
    );

    let filteredPlots = allPlots;
    if (districtFilter !== null) {
      filteredPlots = filteredPlots.filter((plot) =>
        plot.districtId === districtFilter
      );
    }
    if (sizeFilter !== null) {
      filteredPlots = filteredPlots.filter((plot) => plot.size === sizeFilter);
    }
    if (lotteryPhaseFilter !== null) {
      filteredPlots = filteredPlots.filter((plot) => {
        if (!PlotValidationService.isLottery(plot)) {
          return lotteryPhaseFilter === FilterPhase.FCFS;
        }
        if (PlotValidationService.isUnknownOrOutdatedPhase(plot)) {
          return lotteryPhaseFilter === FilterPhase.MISSING_OUTDATED;
        }
        return plot.lotto_phase === lotteryPhaseFilter;
      });
    }
    if (allowedTenantsFilter !== null) {
      filteredPlots = filteredPlots.filter((plot) =>
        (plot.purchase_system & allowedTenantsFilter) !== 0
      );
    }

    const totalPlots = filteredPlots.length;
    const totalPages = Math.ceil(totalPlots / PLOTS_PER_PAGE);
    const hasPagination = totalPlots > PLOTS_PER_PAGE;
    const startIndex = page * PLOTS_PER_PAGE;
    const endIndex = Math.min(startIndex + PLOTS_PER_PAGE, totalPlots);
    const currentPlots = filteredPlots.slice(startIndex, endIndex);

    const title = `${worldDetail.name}`;

    const allPlotsOnWorld: PlotWithDistrict[] = worldDetail.districts.flatMap(
      (district) =>
        district.open_plots.map((plot) => ({
          ...plot,
          districtId: district.id,
          districtName: district.name,
        })),
    );
    const totalPlotsOnWorld = allPlotsOnWorld.length;
    const entryPhasePlots = allPlotsOnWorld.filter((plot) => {
      if (!PlotValidationService.isLottery(plot)) return false;
      if (PlotValidationService.isUnknownOrOutdatedPhase(plot)) return false;
      return plot.lotto_phase === LottoPhase.ENTRY;
    }).length;
    const missingDataPlots =
      allPlotsOnWorld.filter((plot) =>
        PlotValidationService.isUnknownOrOutdatedPhase(plot)
      ).length;
    const missingDataPlotsText = missingDataPlots > 0
      ? `, Missing/outdated data: ${missingDataPlots}`
      : "";

    let description =
      `Open plots: ${totalPlotsOnWorld} (Available: ${entryPhasePlots}${missingDataPlotsText})`;

    const phaseChangeTime = this.getNextOrLatestPhaseChange(worldDetail);
    if (phaseChangeTime > 0) {
      const now = Date.now() / 1000;
      if (phaseChangeTime > now) {
        const discordTimestamp = Math.floor(phaseChangeTime);
        description +=
          `\nLottery phase ends: <t:${discordTimestamp}:F> (<t:${discordTimestamp}:R>)`;
      } else {
        const discordTimestamp = Math.floor(phaseChangeTime);
        description +=
          `\nLottery phase ended: <t:${discordTimestamp}:F> (<t:${discordTimestamp}:R>)`;
      }
    } else {
      description += `\nLottery phase ends: Insufficient data`;
    }

    const activeFilters: string[] = [];
    if (districtFilter !== null) {
      const district = worldDetail.districts.find((district) =>
        district.id === districtFilter
      );
      activeFilters.push(
        TextOutputBuilder.builDistrictWithEmoji(district?.name),
      );
    }
    if (sizeFilter !== null) {
      activeFilters.push(TextOutputBuilder.buildSizeWithEmoji(sizeFilter));
    }
    if (lotteryPhaseFilter !== null) {
      activeFilters.push(
        TextOutputBuilder.buildLotteryPhaseWithEmoji(lotteryPhaseFilter),
      );
    }
    if (allowedTenantsFilter !== null) {
      activeFilters.push(
        TextOutputBuilder.buildAllowedTenantsWithEmoji(allowedTenantsFilter),
      );
    }

    if (totalPlots !== totalPlotsOnWorld) {
      const filteredPlotsText = totalPlots === 1 ? "plot" : "plots";
      if (activeFilters.length > 0) {
        description += `\n\nFiltered ${totalPlots} ${filteredPlotsText}: ${
          activeFilters.join(" • ")
        }`;
      } else {
        description += `\n\nFiltered ${totalPlots} ${filteredPlotsText}`;
      }
    }

    const paissaDbUrl = PaissaDbUrlBuilder.buildUrl(
      worldDetail.id,
      districtFilter,
      sizeFilter,
      lotteryPhaseFilter,
      allowedTenantsFilter,
    );

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setURL(paissaDbUrl)
      .setDescription(description)
      .setColor(ColorHelper.getEmbedColor());

    if (currentPlots.length > 0) {
      currentPlots.forEach((plot: PlotWithDistrict) => {
        embed.addFields({
          name: TextOutputBuilder.buildFieldName(plot),
          value: [
            TextOutputBuilder.builDistrictWithEmoji(plot.districtName),
            TextOutputBuilder.buildSizeWithEmoji(plot.size),
            TextOutputBuilder.buildPriceWithEmoji(plot.price),
            TextOutputBuilder.buildEntries(plot),
            TextOutputBuilder.buildLotteryPhaseWithEmojiByPlot(plot),
            TextOutputBuilder.buildAllowedTenantsWithEmoji(
              plot.purchase_system,
            ),
            TextOutputBuilder.buildLastUpdatedWithEmoji(plot),
            TextOutputBuilder.buildGameToraLinkWithEmoji(plot),
          ].join("\n"),
          inline: true,
        });
      });

      if (hasPagination) {
        const startPlot = startIndex + 1;
        const endPlot = endIndex;
        embed.setFooter({
          text: `Page ${
            page + 1
          }/${totalPages} • Showing plots ${startPlot}-${endPlot} of ${totalPlots} total`,
        });
      }
    }

    return { embed, hasPagination, totalPlots };
  }

  private createPaginationButtons(
    currentPage: number,
    totalPages: number,
  ): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    const jumpToStartButton = new ButtonBuilder()
      .setCustomId("pagination_jump_start")
      .setLabel("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 0);

    const prevButton = new ButtonBuilder()
      .setCustomId("pagination_prev")
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 0);

    const nextButton = new ButtonBuilder()
      .setCustomId("pagination_next")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1);

    const jumpToEndButton = new ButtonBuilder()
      .setCustomId("pagination_jump_end")
      .setLabel("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1);

    row.addComponents(jumpToStartButton);
    row.addComponents(prevButton);
    row.addComponents(nextButton);
    row.addComponents(jumpToEndButton);

    return row;
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [key] of paginationStates.entries()) {
      const stateTimestamp = parseInt(key.split("_").pop() || "0");
      if (now - stateTimestamp > PAGINATION_TIMEOUT_MILLIS) {
        paginationStates.delete(key);
        const collector = activeCollectors.get(key);
        if (collector) {
          collector.stop();
          activeCollectors.delete(key);
        }
      }
    }
  }

  private setupPaginationCollector(
    interaction: ChatInputCommandInteraction,
    stateId: string,
    messageId: string,
  ): void {
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: PAGINATION_TIMEOUT_MILLIS,
      filter: (i) => {
        return i.user.id === interaction.user.id && i.message.id === messageId;
      },
    });

    if (collector) {
      activeCollectors.set(stateId, collector);
    }

    collector?.on("collect", async (buttonInteraction) => {
      const state = paginationStates.get(stateId);
      if (!state) {
        await buttonInteraction.reply({
          content:
            "❌ Pagination session expired. Please run the command again.",
          ephemeral: true,
        });
        return;
      }

      let newPage = state.currentPage;

      switch (buttonInteraction.customId) {
        case "pagination_prev":
          newPage = Math.max(0, state.currentPage - 1);
          break;
        case "pagination_next":
          newPage = Math.min(state.totalPages - 1, state.currentPage + 1);
          break;
        case "pagination_jump_start":
          newPage = 0;
          break;
        case "pagination_jump_end":
          newPage = state.totalPages - 1;
          break;
      }

      if (newPage !== state.currentPage) {
        state.currentPage = newPage;
        const { embed } = this.createHousingEmbed(
          state.worldDetail,
          state.districtId,
          state.sizeFilter,
          state.lotteryPhaseFilter,
          state.allowedTenantsFilter,
          newPage,
        );
        const buttons = this.createPaginationButtons(newPage, state.totalPages);

        try {
          await buttonInteraction.update({
            embeds: [embed as JSONEncodable<APIEmbed>],
            components: [buttons],
          });
        } catch (error: unknown) {
          console.error(error);
        }
      } else {
        await buttonInteraction.deferUpdate();
      }
    });

    collector?.on("end", async () => {
      paginationStates.delete(stateId);
      activeCollectors.delete(stateId);

      try {
        const message = await interaction.fetchReply();
        if (message && "edit" in message) {
          const embeds = message.embeds.map((embed) => {
            const updatedEmbed = new EmbedBuilder(embed as EmbedData);
            updatedEmbed.setFooter({
              text: embed.footer?.text +
                "\nPagination session expired. Run the command again to continue browsing.",
            });
            return updatedEmbed;
          });

          await message.edit({
            embeds: embeds as JSONEncodable<APIEmbed>[],
            components: [],
          });
        }
      } catch (error) {
        console.error("Failed to remove pagination buttons:", error);
      }
    });
  }
}
