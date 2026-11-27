<script setup lang="ts">
import { maxBy, minBy } from "@/lib/collection";
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  ref,
  watch,
  type ComputedRef,
} from "vue";
import { useElementVisibility } from "@vueuse/core";
import { useStore } from "../../store/store";
import type { TableDataType } from "../../types/types";
import ScrollableTableCard from "../layout/ScrollableTableCard.vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { handleImageFallback as handleImageError } from "@/lib/imageFallback";
import { getManagerDisplayName } from "@/lib/manager";
import PreviousSeasonPrompt from "./PreviousSeasonPrompt.vue";

const StandingsChart = defineAsyncComponent(
  () => import("./StandingsChart.vue")
);
const CurrentTrends = defineAsyncComponent(() => import("./CurrentTrends.vue"));

const props = defineProps<{
  originalData: TableDataType[];
  medianScoring: boolean;
  seasonType: string;
}>();

const store = useStore();
const tableOrder = ref("wins");
const showLeagueNews = ref(false);
const leagueNewsTrigger = ref<HTMLElement | null>(null);
const leagueNewsIsVisible = useElementVisibility(leagueNewsTrigger);
let leagueNewsIdleCallback: number | undefined;
let leagueNewsFallbackTimer: number | undefined;

const cancelPendingLeagueNews = () => {
  if (leagueNewsIdleCallback !== undefined) {
    window.cancelIdleCallback(leagueNewsIdleCallback);
    leagueNewsIdleCallback = undefined;
  }
  if (leagueNewsFallbackTimer !== undefined) {
    window.clearTimeout(leagueNewsFallbackTimer);
    leagueNewsFallbackTimer = undefined;
  }
};

watch(
  leagueNewsIsVisible,
  (isVisible) => {
    if (!isVisible) {
      cancelPendingLeagueNews();
      return;
    }
    if (showLeagueNews.value) return;

    const showNews = () => {
      leagueNewsIdleCallback = undefined;
      leagueNewsFallbackTimer = undefined;
      if (!leagueNewsIsVisible.value) return;
      showLeagueNews.value = true;
    };

    const requestIdleCallback = (
      window as unknown as {
        requestIdleCallback?: (callback: IdleRequestCallback) => number;
      }
    ).requestIdleCallback;

    if (requestIdleCallback) {
      leagueNewsIdleCallback = requestIdleCallback(showNews);
    } else {
      leagueNewsFallbackTimer = window.setTimeout(showNews, 250);
    }
  },
  { immediate: true }
);

onBeforeUnmount(cancelPendingLeagueNews);

const tableData: ComputedRef<TableDataType[]> = computed(() => {
  const data = [...props.originalData];
  if (tableOrder.value === "wins") {
    return data.sort((a, b) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "points") {
    return data.sort((a, b) => b.pointsFor - a.pointsFor);
  } else if (tableOrder.value === "pointsAgainst") {
    return data.sort((a, b) => b.pointsAgainst - a.pointsAgainst);
  } else if (tableOrder.value === "rating") {
    return data.sort((a, b) => b.rating - a.rating);
  } else if (tableOrder.value === "recordAgainstAll") {
    return data.sort((a, b) => {
      if (a.winsAgainstAll !== b.winsAgainstAll) {
        return b.winsAgainstAll - a.winsAgainstAll;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "medianRecord") {
    return data.sort((a, b) => {
      const aWins = props.medianScoring
        ? (a.headToHeadWins ?? 0)
        : a.winsWithMedian;
      const bWins = props.medianScoring
        ? (b.headToHeadWins ?? 0)
        : b.winsWithMedian;
      if (aWins !== bWins) {
        return bWins - aWins;
      }
      if (
        props.medianScoring &&
        (a.headToHeadTies ?? 0) !== (b.headToHeadTies ?? 0)
      ) {
        return (b.headToHeadTies ?? 0) - (a.headToHeadTies ?? 0);
      }
      return b.pointsFor - a.pointsFor;
    });
  }
  return data;
});

const mostWins = computed(() => maxBy(props.originalData, "wins")?.wins);
const mostLosses = computed(() => maxBy(props.originalData, "losses")?.losses);
const mostPoints = computed(
  () => maxBy(props.originalData, "pointsFor")?.pointsFor
);
const leastPoints = computed(
  () => minBy(props.originalData, "pointsFor")?.pointsFor
);
const mostPointsAgainst = computed(
  () => maxBy(props.originalData, "pointsAgainst")?.pointsAgainst
);
const leastPointsAgainst = computed(
  () => minBy(props.originalData, "pointsAgainst")?.pointsAgainst
);
const mostWinsAgainstAll = computed(
  () => maxBy(props.originalData, "winsAgainstAll")?.winsAgainstAll
);
const mostLossesAgainstAll = computed(
  () => maxBy(props.originalData, "lossesAgainstAll")?.lossesAgainstAll
);
const mostMedianWins = computed(
  () => maxBy(props.originalData, "winsWithMedian")?.winsWithMedian
);
const mostMedianLosses = computed(
  () => maxBy(props.originalData, "lossesWithMedian")?.lossesWithMedian
);
const mostHeadToHeadWins = computed(
  () => maxBy(props.originalData, "headToHeadWins")?.headToHeadWins
);
const mostHeadToHeadLosses = computed(
  () => maxBy(props.originalData, "headToHeadLosses")?.headToHeadLosses
);

const getTeamName = (tableDataItem: TableDataType) => {
  return getManagerDisplayName(tableDataItem, store.showUsernames);
};
</script>

<template>
  <div>
    <PreviousSeasonPrompt v-if="store.currentLeagueId" />
    <div
      class="grid h-full min-h-0 grid-cols-1 gap-4 mt-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]"
    >
      <ScrollableTableCard label="League standings" class="w-full">
        <TooltipProvider>
          <table
            v-if="tableData.length > 0"
            class="min-w-[760px] table-fixed text-sm text-left w-full rtl:text-right xl:min-w-0"
          >
            <colgroup>
              <col class="w-[30%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[14%]" />
              <col class="w-[16%]" />
              <col class="w-[16%]" />
            </colgroup>
            <thead class="text-xs uppercase bg-muted/50">
              <tr>
                <th scope="col" class="px-4 py-3 sm:px-6">Team name</th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="tableOrder === 'wins' ? 'descending' : 'none'"
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'wins'"
                        class="flex min-h-11 items-center text-left uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Record
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'wins'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Regular season wins and losses
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="tableOrder === 'points' ? 'descending' : 'none'"
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'points'"
                        class="flex min-h-11 items-center text-left uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Points
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'points'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Total regular season points
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="
                    tableOrder === 'pointsAgainst' ? 'descending' : 'none'
                  "
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'pointsAgainst'"
                        class="flex min-h-11 w-20 items-center text-left uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Points Against
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'pointsAgainst'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Total regular season points against
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="
                    tableOrder === 'recordAgainstAll' ? 'descending' : 'none'
                  "
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'recordAgainstAll'"
                        class="flex min-h-11 w-20 items-center text-left uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Record vs. All
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'recordAgainstAll'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="w-40 bg-muted-foreground">
                      Team record if each team played every other team each week
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="
                    tableOrder === 'medianRecord' ? 'descending' : 'none'
                  "
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'medianRecord'"
                        class="flex min-h-11 w-20 items-center text-left uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        {{ medianScoring ? "H2H Record" : "Median Record" }}
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'medianRecord'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="w-40 bg-muted-foreground">
                      <template v-if="medianScoring">
                        Head-to-head record from each team's scheduled weekly
                        matchup, excluding results against the league median.
                      </template>
                      <template v-else>
                        Team record where a win is awarded if a team's weekly
                        score is higher than the league median, and a loss is
                        added if the score is less than the median.
                      </template>
                    </TooltipContent>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in tableData"
                :key="index"
                class="border-b"
              >
                <th scope="row" class="px-4 py-3 font-medium sm:px-6">
                  <div class="flex items-center min-w-0">
                    <img
                      alt="User avatar"
                      v-if="item.avatarImg"
                      class="w-8 h-8 rounded-full"
                      :src="item.avatarImg"
                      @error="handleImageError"
                    />
                    <svg
                      v-else
                      class="w-8 h-8 shrink-0"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="-0.5 -0.5 21 21"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <p class="ml-2">{{ index + 1 }}.&nbsp;</p>
                    <p class="min-w-0 truncate">
                      {{ getTeamName(item) }}
                    </p>
                  </div>
                </th>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold': item.wins === mostWins,
                    'text-destructive font-semibold':
                      item.losses === mostLosses,
                  }"
                >
                  {{ item.wins }} - {{ item.losses }}
                  {{ item.ties != 0 ? `- ${item.ties}` : "" }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold': item.pointsFor === mostPoints,
                    'text-destructive font-semibold':
                      item.pointsFor === leastPoints,
                  }"
                >
                  {{ item.pointsFor }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold':
                      item.pointsAgainst === mostPointsAgainst,
                    'text-destructive font-semibold':
                      item.pointsAgainst === leastPointsAgainst,
                  }"
                >
                  {{ item.pointsAgainst }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold':
                      item.winsAgainstAll === mostWinsAgainstAll,
                    'text-destructive font-semibold':
                      item.lossesAgainstAll === mostLossesAgainstAll,
                  }"
                >
                  {{ item.winsAgainstAll }} - {{ item.lossesAgainstAll }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold': medianScoring
                      ? item.headToHeadWins === mostHeadToHeadWins
                      : item.winsWithMedian === mostMedianWins,
                    'text-destructive font-semibold': medianScoring
                      ? item.headToHeadLosses === mostHeadToHeadLosses
                      : item.lossesWithMedian === mostMedianLosses,
                  }"
                >
                  <template v-if="medianScoring">
                    {{ item.headToHeadWins ?? 0 }} -
                    {{ item.headToHeadLosses ?? 0 }}
                    {{ item.headToHeadTies ? `- ${item.headToHeadTies}` : "" }}
                  </template>
                  <template v-else>
                    {{ item.winsWithMedian ? item.winsWithMedian : 0 }} -
                    {{ item.lossesWithMedian ? item.lossesWithMedian : 0 }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </TooltipProvider>
      </ScrollableTableCard>
      <div ref="leagueNewsTrigger" class="min-h-px min-w-0">
        <CurrentTrends
          v-if="showLeagueNews && seasonType !== 'Guillotine'"
          :tableData="tableData"
          class="h-full"
        />
      </div>
    </div>
    <StandingsChart :tableData="tableData" class="my-4" />
  </div>
</template>
