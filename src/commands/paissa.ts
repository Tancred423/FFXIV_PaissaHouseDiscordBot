import {
  ActionRowBuilder,
  APIActionRowComponent,
  APIEmbed,
  APIMessageActionRowComponent,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  EmbedData,
  JSONEncodable,
  SlashCommandBuilder,
} from "discord.js";
import { ColorHelper } from "../utils/Colors.ts";
import { Command } from "../types/Command.ts";
import { getDatacenters, getWorldsByDatacenter } from "../data/Worlds.ts";
import { PaissaApiService, WorldDetail } from "../services/PaissaApi.ts";
import { Formatters } from "../utils/Formatters.ts";
import { PlotWithDistrict } from "../types/PlotWithDistrict.ts";
import { PaginationState } from "../types/PaginationState.ts";

const PLOTS_PER_PAGE = 9;
const PAGINATION_TIMEOUT_MILLIS = 5 * 60 * 1000;
const paginationStates = new Map<string, PaginationState>();

export const paissa: Command = {
  data: createPaissaCommandBuilder(),

  async execute(interaction: ChatInputCommandInteraction) {
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

    const { embed, hasPagination, totalPlots } = createHousingEmbed(
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

    const stateId = `${interaction.user.id}_${Date.now()}`;
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

    const buttons = createPaginationButtons(0, totalPages);
    await interaction.editReply({
      embeds: [embed as JSONEncodable<APIEmbed>],
      components: [
        buttons as JSONEncodable<
          APIActionRowComponent<APIMessageActionRowComponent>
        >,
      ],
    });

    setupPaginationCollector(interaction, stateId);
  },
};

function createPaissaCommandBuilder(): SlashCommandBuilder {
  const paissaBuilder = new SlashCommandBuilder()
    .setName("paissa")
    .setDescription(
      "Get detailed housing information for a specific district and world",
    );

  const datacenters = getDatacenters();
  datacenters.forEach((datacenter) => {
    const worlds = getWorldsByDatacenter(datacenter);

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
            .setDescription("District to get detailed housing information for")
            .setRequired(false)
            .addChoices(
              { name: "Mist", value: "339" },
              { name: "The Lavender Beds", value: "340" },
              { name: "The Goblet", value: "341" },
              { name: "Shirogane", value: "641" },
              { name: "Empyreum", value: "979" },
            )
        )
        .addStringOption((option) =>
          option
            .setName("size")
            .setDescription("Filter by plot size (optional)")
            .setRequired(false)
            .addChoices(
              { name: "Small", value: "0" },
              { name: "Medium", value: "1" },
              { name: "Large", value: "2" },
            )
        )
        .addStringOption((option) =>
          option
            .setName("lottery-phase")
            .setDescription("Filter by lottery phase (optional)")
            .setRequired(false)
            .addChoices(
              { name: "Accepting Entries", value: "1" },
              { name: "Results", value: "2" },
              { name: "Unavailable", value: "3" },
              { name: "FCFS", value: "-2" },
              { name: "Missing/Outdated", value: "-1" },
            )
        )
        .addStringOption((option) =>
          option
            .setName("allowed-tenants")
            .setDescription("Filter by allowed tenants (optional)")
            .setRequired(false)
            .addChoices(
              { name: "Free Company", value: "3" },
              { name: "Individual", value: "5" },
              { name: "Unrestricted", value: "7" },
            )
        )
    );
  });

  return paissaBuilder;
}

function createHousingEmbed(
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
    filteredPlots = filteredPlots.filter((plot) =>
      plot.lotto_phase === lotteryPhaseFilter ||
      (lotteryPhaseFilter === -1 && plot.lotto_phase === null)
    );
  }
  if (allowedTenantsFilter !== null) {
    filteredPlots = filteredPlots.filter((plot) =>
      plot.purchase_system === allowedTenantsFilter
    );
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
    description += ` (${Formatters.getSizeText(sizeFilter)} only)`;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(ColorHelper.getEmbedColor());

  if (currentPlots.length > 0) {
    currentPlots.forEach((plot: PlotWithDistrict) => {
      embed.addFields({
        name: Formatters.getFieldNameText(plot),
        value: [
          Formatters.getDistrictText(districtFilter, plot),
          Formatters.getSizeText(plot.size),
          Formatters.getPriceText(plot),
          Formatters.getEntriesText(plot),
          Formatters.getLotteryPhaseText(plot),
          Formatters.getAllowedTenantsText(plot),
          Formatters.getLastUpdatedText(plot),
          Formatters.getGameToraLinkText(plot),
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

function createPaginationButtons(
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

function setupPaginationCollector(
  interaction: ChatInputCommandInteraction,
  stateId: string,
) {
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: PAGINATION_TIMEOUT_MILLIS,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector?.on("collect", async (buttonInteraction) => {
    const state = paginationStates.get(stateId);
    if (!state) {
      await buttonInteraction.reply({
        content: "❌ Pagination session expired. Please run the command again.",
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
      const { embed } = createHousingEmbed(
        state.worldDetail,
        state.districtId,
        state.sizeFilter,
        state.lotteryPhaseFilter,
        state.allowedTenantsFilter,
        newPage,
      );
      const buttons = createPaginationButtons(newPage, state.totalPages);

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
