<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from "vue";
import { useRoute } from "vue-router";
import { createTableData } from "../../api/helper";
import { useStore } from "../../store/store";
import type {
  PointsType,
  RosterType,
  TableDataType,
  UserType,
} from "../../types/types";
import {
  getFeatureFromViewSlug,
  isLeagueFeature,
  isLeagueFeatureAvailable,
  normalizeLeagueFeature,
  type LeagueFeature,
} from "@/lib/features";
import Narratives from "../league_narratives/Narratives.vue";

const StandingsView = defineAsyncComponent(
  () => import("../standings/StandingsView.vue")
);
const TeamDashboard = defineAsyncComponent(
  () => import("../dashboard/TeamDashboard.vue")
);
const PowerRankingData = defineAsyncComponent(
  () => import("../power_rankings/PowerRankingData.vue")
);
const ExpectedWinsCard = defineAsyncComponent(
  () => import("../expected_wins/ExpectedWinsCard.vue")
);
const ExpectedWinsChart = defineAsyncComponent(
  () => import("../expected_wins/ExpectedWinsChart.vue")
);
const ExpectedWinsChart2 = defineAsyncComponent(
  () => import("../expected_wins/ExpectedWinsChart2.vue")
);
const TransactionsChart = defineAsyncComponent(
  () => import("../roster_management/TransactionsChart.vue")
);
const Trades = defineAsyncComponent(
  () => import("../roster_management/Trades.vue")
);
const Waivers = defineAsyncComponent(
  () => import("../roster_management/Waivers.vue")
);
const ManagementCard = defineAsyncComponent(
  () => import("../roster_management/ManagementCard.vue")
);
const RankingGraph = defineAsyncComponent(
  () => import("../roster_management/RankingGraph.vue")
);
const Playoffs = defineAsyncComponent(() => import("../playoffs/Playoffs.vue"));
const LeagueHistory = defineAsyncComponent(
  () => import("../league_history/LeagueHistory.vue")
);
const Projections = defineAsyncComponent(
  () => import("../power_rankings/Projections.vue")
);
const PlayoffPercentages = defineAsyncComponent(
  () => import("../playoffs/PlayoffPercentages.vue")
);
const WeeklyReport = defineAsyncComponent(
  () => import("../weekly_report/WeeklyReport.vue")
);
const Draft = defineAsyncComponent(() => import("../draft/Draft.vue"));
const TeamRanking = defineAsyncComponent(
  () => import("../power_rankings/TeamRanking.vue")
);
const ScheduleStrength = defineAsyncComponent(
  () => import("../expected_wins/ScheduleStrength.vue")
);
const StartSitDashboard = defineAsyncComponent(
  () => import("../start_sit/StartSitDashboard.vue")
);
const ScheduleAnalysis = defineAsyncComponent(
  () => import("../expected_wins/ScheduleAnalysis.vue")
);
const Wrapped = defineAsyncComponent(() => import("../wrapped/Wrapped.vue"));
const FakeWrapped = defineAsyncComponent(
  () => import("../wrapped/FakeWrapped.vue")
);
const Intro = defineAsyncComponent(() => import("../home/Intro.vue"));
const PodcastHub = defineAsyncComponent(
  () => import("../podcast/PodcastHub.vue")
);
const ScheduleSimulator = defineAsyncComponent(
  () => import("../schedule_simulator/ScheduleSimulator.vue")
);
const TradeLab = defineAsyncComponent(
  () => import("../trade_lab/TradeLab.vue")
);
const PlayerValues = defineAsyncComponent(
  () => import("../player_values/PlayerValues.vue")
);

const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  points: PointsType[];
}>();

const store = useStore();
const route = useRoute();

const seasonType = computed(() =>
  store.currentLeague ? store.currentLeague.seasonType : ""
);

const regularSeasonLength = computed(() => {
  if (!store.currentLeague) return 15;
  if (store.currentLeague.status == "in_season") {
    return store.currentLeague.lastScoredWeek + 1;
  }
  return store.currentLeague.regularSeasonLength + 1;
});

const totalRosters = computed(() => store.currentLeague?.totalRosters ?? 10);

const medianScoring = computed(() =>
  store.currentLeague ? store.currentLeague.medianScoring === 1 : false
);

const showStandingsTab = computed(
  () => store.currentTab === "Standings" || !isLeagueFeature(store.currentTab)
);

const isActiveFeature = (feature: LeagueFeature) =>
  store.currentTab === feature &&
  isLeagueFeatureAvailable(feature, seasonType.value);

onMounted(() => {
  const urlView = getFeatureFromViewSlug(route.query.view);
  if (urlView) {
    store.currentTab = urlView;
    localStorage.setItem("currentTab", urlView);
    return;
  }
  const savedCurrentTab = localStorage.getItem("currentTab");
  if (savedCurrentTab) {
    const currentTab = normalizeLeagueFeature(savedCurrentTab);
    store.currentTab = currentTab;
    if (currentTab !== savedCurrentTab) {
      localStorage.setItem("currentTab", currentTab);
    }
  }
});

const originalData = computed(() => {
  if (props.users && props.points) {
    return createTableData(
      props.users,
      props.rosters,
      props.points,
      medianScoring.value
    );
  }
  return [];
});

const sortedTableData = computed<TableDataType[]>(() => {
  return [...originalData.value].sort((a, b) => {
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    return b.pointsFor - a.pointsFor;
  });
});
</script>

<template>
  <div :class="['min-w-0', store.currentTab === 'Home' ? '' : 'mx-4']">
    <TeamDashboard
      v-if="store.currentTab === 'Dashboard'"
      :tableData="sortedTableData"
      :originalData="originalData"
    />

    <StandingsView
      v-if="showStandingsTab"
      :originalData="originalData"
      :medianScoring="medianScoring"
      :seasonType="seasonType"
    />

    <div v-if="store.currentTab === 'Power Rankings'">
      <PowerRankingData
        v-if="store.currentLeagueId"
        :tableData="sortedTableData"
        :regularSeasonLength="regularSeasonLength ? regularSeasonLength : 15"
        :totalRosters="totalRosters"
        class="mt-4"
      />
      <PowerRankingData
        v-else-if="store.leagueInfo.length == 0"
        :tableData="sortedTableData"
        :regularSeasonLength="15"
        :totalRosters="10"
        class="mt-4"
      />
      <Projections class="mt-4" />
      <TeamRanking
        v-if="seasonType !== 'Guillotine'"
        :tableData="sortedTableData"
        class="my-4"
      />
    </div>

    <div v-if="store.currentTab === 'Expected Wins'">
      <div class="grid items-stretch grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        <ExpectedWinsCard
          :tableData="sortedTableData"
          class="w-full h-full min-w-0"
        />
        <ExpectedWinsChart
          :tableData="sortedTableData"
          class="w-full h-full min-w-0"
        />
      </div>
      <div class="grid items-stretch grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        <ExpectedWinsChart2
          :tableData="sortedTableData"
          class="w-full h-full min-w-0"
        />
        <ScheduleStrength
          :tableData="sortedTableData"
          class="w-full h-full min-w-0"
        />
      </div>
      <ScheduleAnalysis :tableData="sortedTableData" />
    </div>

    <div v-if="store.currentTab === 'Roster Management'">
      <div class="grid items-stretch grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        <ManagementCard
          :tableData="sortedTableData"
          class="w-full h-full min-w-0 overflow-auto"
        />
        <RankingGraph
          :tableData="sortedTableData"
          class="w-full h-full min-w-0"
        />
      </div>
      <TransactionsChart class="mt-4" />
      <Trades class="mt-4" />
      <Waivers class="mt-4" :table-data="sortedTableData" />
    </div>

    <div class="w-full" v-if="store.currentTab === 'Playoffs'">
      <PlayoffPercentages :propsTableData="sortedTableData" class="mt-4" />
      <Playoffs class="mb-4" :tableData="sortedTableData" />
    </div>

    <div class="w-full" v-if="isActiveFeature('Podcast')">
      <PodcastHub class="mt-4" />
    </div>

    <div v-if="isActiveFeature('Weekly Report')">
      <WeeklyReport
        v-if="store.currentLeagueId"
        :tableData="sortedTableData"
        :regular-season-length="regularSeasonLength ? regularSeasonLength : 15"
      />
      <WeeklyReport
        v-else
        :tableData="sortedTableData"
        :regular-season-length="15"
      />
    </div>

    <div v-if="isActiveFeature('Season Forecast')">
      <ScheduleSimulator class="my-4" :tableData="sortedTableData" />
    </div>

    <div v-if="store.currentTab === 'Trade Lab'">
      <TradeLab class="my-4" :tableData="sortedTableData" />
    </div>

    <div v-if="store.currentTab === 'Player Values'">
      <PlayerValues :tableData="sortedTableData" />
    </div>

    <div v-if="store.currentTab === 'Draft'">
      <Draft class="my-4" />
    </div>

    <div v-if="store.currentTab === 'Start/Sit'">
      <StartSitDashboard :tableData="sortedTableData" class="mt-4" />
    </div>

    <div v-if="store.currentTab === 'League History'">
      <LeagueHistory :tableData="sortedTableData" />
    </div>

    <div v-if="isActiveFeature('Manager Profiles')">
      <Narratives :tableData="sortedTableData" />
    </div>

    <div v-if="store.currentTab === 'Wrapped'">
      <Wrapped
        v-if="
          store.currentLeagueId &&
          store.currentLeague?.season === '2025' &&
          seasonType !== 'Guillotine'
        "
        :tableData="originalData"
      />
      <div class="p-4" v-else-if="store.currentLeague?.season === '2026'">
        <p>Come back after the season is complete!</p>
      </div>
      <FakeWrapped v-else />
    </div>

    <div v-if="store.currentTab === 'Home'">
      <Intro>
        <template #header>
          <TransactionsChart />
          <Waivers class="text-left" :table-data="sortedTableData" />
          <Projections />
          <ExpectedWinsChart :tableData="sortedTableData" />
          <PowerRankingData
            class="mb-4"
            :tableData="sortedTableData"
            :regularSeasonLength="15"
            :totalRosters="10"
          />
        </template>
      </Intro>
    </div>
  </div>
</template>
