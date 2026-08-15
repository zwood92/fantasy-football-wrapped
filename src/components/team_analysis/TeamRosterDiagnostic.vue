<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/store/store";
import { getChartTheme, getChartTooltipTheme } from "@/lib/chartTheme";
import type {
  ConsistencyMetrics,
  LineupEfficiencyMetrics,
  RosterAlert,
} from "@/lib/teamAnalysisEngine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PlayerAvatar from "@/components/shared/PlayerAvatar.vue";

const props = defineProps<{
  consistency: ConsistencyMetrics;
  efficiency: LineupEfficiencyMetrics;
  alerts?: RosterAlert[];
  teamName?: string;
}>();

const store = useStore();

const getVolatilityColorClass = (label: ConsistencyMetrics["volatilityLabel"]) => {
  switch (label) {
    case "Rock Solid":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "Moderately Consistent":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "High Volatility":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "Wild Rollercoaster":
      return "bg-destructive/15 text-destructive border-destructive/30";
  }
};

const getAlertBorderClass = (type: RosterAlert["type"]) => {
  switch (type) {
    case "warning":
      return "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300";
    case "success":
      return "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
    case "info":
      return "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300";
  }
};

const weeklyChartOptions = computed(() => {
  const theme = getChartTheme();
  const isDark = store.darkMode;

  const categories = props.consistency.weeklyScores.map((w) => `Wk ${w.week}`);

  return {
    chart: {
      type: "bar" as const,
      toolbar: { show: false },
      animations: { enabled: false },
      foreColor: theme.mutedForeground,
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    },
    colors: [theme.positive || "#22c55e", theme.mutedForeground || "#6b7280"],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "55%",
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories,
      labels: {
        style: { fontSize: "11px", fontWeight: 500 },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: {
        text: "Points",
        style: { fontSize: "11px", fontWeight: 600, color: theme.mutedForeground },
      },
      labels: {
        formatter: (val: number) => `${Math.round(val)}`,
      },
    },
    annotations: {
      yaxis: [
        {
          y: props.consistency.averageScore,
          borderColor: theme.positive || "#22c55e",
          strokeDashArray: 4,
          label: {
            text: `Avg: ${props.consistency.averageScore}`,
            style: {
              background: theme.background,
              color: theme.foreground,
              fontSize: "11px",
              fontWeight: 600,
            },
          },
        },
      ],
    },
    legend: {
      position: "top" as const,
      horizontalAlign: "right" as const,
      fontSize: "12px",
      labels: { colors: theme.foreground },
    },
    tooltip: {
      theme: getChartTooltipTheme(isDark),
      y: {
        formatter: (val: number) => `${val} pts`,
      },
    },
  };
});

const weeklySeries = computed(() => [
  {
    name: "Score",
    data: props.consistency.weeklyScores.map((w) => w.score),
  },
  {
    name: "League Median",
    data: props.consistency.weeklyScores.map((w) => w.leagueMedian),
  },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Top KPI Grid: Lineup Efficiency & Depth Indicators -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <Card class="p-4 border bg-card">
        <div class="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
          Lineup Efficiency
        </div>
        <div class="flex items-baseline gap-2">
          <div class="text-2xl font-bold text-foreground">
            {{ efficiency.efficiencyPercentage }}%
          </div>
          <Badge variant="outline" class="text-xs font-semibold">
            Rank #{{ efficiency.efficiencyRank }}
          </Badge>
        </div>
        <div class="text-[11px] text-muted-foreground mt-1">
          Grade: <span class="font-semibold text-foreground">{{ efficiency.efficiencyGrade }}</span>
        </div>
      </Card>

      <Card class="p-4 border bg-card">
        <div class="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
          Bench Points Left
        </div>
        <div class="flex items-baseline gap-2">
          <div class="text-2xl font-bold text-foreground">
            {{ efficiency.pointsLeftOnBenchPerWeek }}
          </div>
          <span class="text-xs text-muted-foreground font-medium">pts / week</span>
        </div>
        <div class="text-[11px] text-muted-foreground mt-1">
          Total: <span class="font-medium text-foreground">{{ efficiency.pointsLeftOnBench }} pts</span>
        </div>
      </Card>

      <Card class="p-4 border bg-card">
        <div class="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
          Scoring Ceiling / Floor
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {{ consistency.ceiling }}
          </span>
          <span class="text-xs text-muted-foreground">/</span>
          <span class="text-xl font-bold text-amber-600 dark:text-amber-400">
            {{ consistency.floor }}
          </span>
        </div>
        <div class="text-[11px] text-muted-foreground mt-1">
          Spread: <span class="font-medium text-foreground">{{ consistency.range }} pts</span>
        </div>
      </Card>

      <Card class="p-4 border bg-card">
        <div class="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
          Consistency Profile
        </div>
        <div class="text-xl font-bold text-foreground truncate">
          {{ consistency.volatilityLabel }}
        </div>
        <div class="text-[11px] text-muted-foreground mt-1">
          Std Dev: <span class="font-semibold text-foreground">±{{ consistency.standardDeviation }} pts</span> ({{ consistency.coefficientOfVariation }}%)
        </div>
      </Card>
    </div>

    <!-- Weekly Performance Bar Chart -->
    <Card class="p-4 sm:p-6 border bg-card">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h4 class="text-sm font-semibold text-foreground">
            Weekly Scoring Trajectory vs. League Median
          </h4>
          <p class="text-xs text-muted-foreground">
            Compare actual team points scored with the league median for each week.
          </p>
        </div>

        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span class="text-muted-foreground">Boom ({{ consistency.boomWeeks }})</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-xs bg-destructive" />
            <span class="text-muted-foreground">Bust ({{ consistency.bustWeeks }})</span>
          </div>
        </div>
      </div>

      <div class="min-h-[260px]">
        <apexchart
          type="bar"
          height="280"
          :options="weeklyChartOptions"
          :series="weeklySeries"
        />
      </div>
    </Card>

    <!-- Starters vs Bench Diagnostics Breakdown -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card class="p-4 border bg-card">
        <h4 class="text-sm font-semibold text-foreground mb-3">
          Roster Depth & Reliability Metrics
        </h4>

        <div class="space-y-4 text-xs">
          <div>
            <div class="flex justify-between font-medium mb-1">
              <span class="text-muted-foreground">Starter Reliability Index</span>
              <span class="text-foreground font-bold">{{ efficiency.starterReliabilityIndex }} / 100</span>
            </div>
            <div class="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full bg-emerald-500"
                :style="{ width: `${efficiency.starterReliabilityIndex}%` }"
              />
            </div>
            <p class="text-[11px] text-muted-foreground mt-1">
              Measures how consistently your weekly starting lineup delivers projected baseline points.
            </p>
          </div>

          <div>
            <div class="flex justify-between font-medium mb-1">
              <span class="text-muted-foreground">Roster Depth Score</span>
              <span class="text-foreground font-bold">{{ efficiency.rosterDepthScore }} / 100</span>
            </div>
            <div class="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full bg-blue-500"
                :style="{ width: `${efficiency.rosterDepthScore}%` }"
              />
            </div>
            <p class="text-[11px] text-muted-foreground mt-1">
              Average bench output: {{ efficiency.benchPointsAvg }} PPG available for injury/bye coverage.
            </p>
          </div>

          <div class="pt-2 border-t flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Recent Form Trend:</span>
            <Badge
              variant="outline"
              :class="[
                'font-semibold',
                consistency.trend === 'Trending Up'
                  ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : consistency.trend === 'Trending Down'
                    ? 'text-destructive border-destructive/30'
                    : 'text-muted-foreground',
              ]"
            >
              {{ consistency.trend }} ({{ consistency.trendDelta >= 0 ? `+${consistency.trendDelta}` : consistency.trendDelta }} pts)
            </Badge>
          </div>
        </div>
      </Card>

      <!-- Roster Alerts & Diagnostics -->
      <Card class="p-4 border bg-card">
        <h4 class="text-sm font-semibold text-foreground mb-3">
          Roster Diagnostics & Strategic Alerts
        </h4>

        <div v-if="alerts && alerts.length > 0" class="space-y-2.5">
          <div
            v-for="(alert, index) in alerts"
            :key="index"
            :class="['p-3 rounded-lg border text-xs flex items-start gap-2.5', getAlertBorderClass(alert.type)]"
          >
            <PlayerAvatar
              v-if="alert.playerId || alert.playerName || alert.playerPosition"
              :player-id="alert.playerId"
              :name="alert.playerName"
              :position="alert.playerPosition"
              :team="alert.playerTeam"
              size="xs"
              class="mt-0.5 shrink-0"
            />
            <div class="min-w-0">
              <div class="font-semibold text-foreground mb-0.5">
                {{ alert.title }}
              </div>
              <div class="text-muted-foreground text-[11px]">
                {{ alert.description }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="p-6 text-center text-xs text-muted-foreground">
          No urgent roster alerts detected for this team.
        </div>
      </Card>
    </div>
  </div>
</template>
