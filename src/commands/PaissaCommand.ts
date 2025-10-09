import {
  ActionRowBuilder,
  APIActionRowComponent,
  APIEmbed,
  APIMessageActionRowComponent,
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

const PLOTS_PER_PAGE = 9;
const PAGINATION_TIMEOUT_MILLIS = 5 * 60 * 1000;
const paginationStates = new Map<string, PaginationState>();
const activeCollectors = new Map<
  string,
  InteractionCollector<ButtonInteraction<CacheType>>
>();

const FILTER_FCFS = -2;
const FILTER_MISSING_OUTDATED = -1;

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
      components: [
        buttons as JSONEncodable<
          APIActionRowComponent<APIMessageActionRowComponent>
        >,
      ],
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
                { name: "FCFS", value: FILTER_FCFS.toString() },
                {
                  name: "Missing/Outdated",
                  value: FILTER_MISSING_OUTDATED.toString(),
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
                {
                  name: "Unrestricted",
                  value:
                    (PurchaseSystem.FREE_COMPANY | PurchaseSystem.INDIVIDUAL)
                      .toString(),
                },
              )
          )
      );
    });

    return paissaBuilder;
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
          return lotteryPhaseFilter === FILTER_FCFS;
        }
        if (PlotValidationService.isUnknownOrOutdatedPhase(plot)) {
          return lotteryPhaseFilter === FILTER_MISSING_OUTDATED;
        }
        return plot.lotto_phase === lotteryPhaseFilter;
      });
    }
    if (allowedTenantsFilter !== null) {
      filteredPlots = filteredPlots.filter((plot) => {
        if (
          allowedTenantsFilter ===
            (PurchaseSystem.FREE_COMPANY | PurchaseSystem.INDIVIDUAL)
        ) {
          return (plot.purchase_system & PurchaseSystem.FREE_COMPANY) !== 0 &&
            (plot.purchase_system & PurchaseSystem.INDIVIDUAL) !== 0;
        }
        return (plot.purchase_system & allowedTenantsFilter) !== 0;
      });
    }

    const totalPlots = filteredPlots.length;
    const totalPages = Math.ceil(totalPlots / PLOTS_PER_PAGE);
    const hasPagination = totalPlots > PLOTS_PER_PAGE;

    const startIndex = page * PLOTS_PER_PAGE;
    const endIndex = Math.min(startIndex + PLOTS_PER_PAGE, totalPlots);
    const currentPlots = filteredPlots.slice(startIndex, endIndex);

    let title = `${worldDetail.name}`;
    let description = `Open Plots: ${totalPlots}`;

    if (districtFilter !== null) {
      const district = worldDetail.districts.find((district) =>
        district.id === districtFilter
      );
      title += ` - ${district?.name || "Unknown District"}`;
      description = `Open Plots in ${
        district?.name || "Unknown District"
      }: ${totalPlots}`;
    }

    if (sizeFilter !== null) {
      description += ` (${TextOutputBuilder.getSizeText(sizeFilter)} only)`;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(ColorHelper.getEmbedColor());

    if (currentPlots.length > 0) {
      currentPlots.forEach((plot: PlotWithDistrict) => {
        embed.addFields({
          name: TextOutputBuilder.getFieldNameText(plot),
          value: [
            TextOutputBuilder.getDistrictText(districtFilter, plot),
            TextOutputBuilder.getSizeText(plot.size),
            TextOutputBuilder.getPriceText(plot),
            TextOutputBuilder.getEntriesText(plot),
            TextOutputBuilder.getLotteryPhaseText(plot),
            TextOutputBuilder.getAllowedTenantsText(plot),
            TextOutputBuilder.getLastUpdatedText(plot),
            TextOutputBuilder.getGameToraLinkText(plot),
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
            components: [
              buttons as JSONEncodable<
                APIActionRowComponent<APIMessageActionRowComponent>
              >,
            ],
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
