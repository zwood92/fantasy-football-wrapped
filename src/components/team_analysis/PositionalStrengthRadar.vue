<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "@/store/store";
import { getChartTheme, getChartTooltipTheme } from "@/lib/chartTheme";
import type { PositionKey, PositionalGrade } from "@/lib/teamAnalysisEngine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PlayerAvatar from "@/components/shared/PlayerAvatar.vue";

const props = defineProps<{
  grades: Record<PositionKey, PositionalGrade>;
  radarData?: {
    categories: PositionKey[];
    teamScores: number[];
    leagueAverages: number[];
  };
  teamName?: string;
}>();

const store = useStore();
const viewMode = ref<"radar" | "bars">("radar");

const positions: PositionKey[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

const positionLabels: Record<PositionKey, string> = {
  QB: "Quarterbacks",
  RB: "Running Backs",
  WR: "Wide Receivers",
  TE: "Tight Ends",
  K: "Kickers",
  DEF: "Defense / ST",
};

const getGradeColorClass = (grade: string) => {
  if (grade.startsWith("A")) {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  if (grade.startsWith("B")) {
    return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
  }
  if (grade.startsWith("C")) {
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  }
  return "bg-destructive/15 text-destructive border-destructive/30";
};

const getTierColorClass = (tier: PositionalGrade["tier"]) => {
  switch (tier) {
    case "Elite":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "Strong":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "Average":
      return "bg-muted text-muted-foreground border-border";
    case "Vulnerable":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "Critical Need":
      return "bg-destructive/10 text-destructive border-destructive/20";
  }
};

const chartOptions = computed(() => {
  const theme = getChartTheme();
  const isDark = store.darkMode;

  return {
    chart: {
      type: "radar" as const,
      toolbar: { show: false },
      animations: { enabled: false },
      foreColor: theme.mutedForeground,
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    },
    colors: [theme.positive || "#22c55e", theme.mutedForeground || "#6b7280"],
    stroke: {
      width: [2.5, 1.5],
      dashArray: [0, 4],
    },
    fill: {
      opacity: [0.25, 0.05],
    },
    markers: {
      size: 4,
      strokeWidth: 1,
    },
    xaxis: {
      categories: props.radarData?.categories || positions,
      labels: {
        style: {
          fontSize: "12px",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      show: false,
      min: 0,
      max: 100,
      tickAmount: 4,
    },
    plotOptions: {
      radar: {
        polygons: {
          strokeColors: isDark ? "#27272a" : "#e4e4e7",
          connectorColors: isDark ? "#27272a" : "#e4e4e7",
          fill: {
            colors: isDark ? ["#18181b", "#09090b"] : ["#fafafa", "#ffffff"],
          },
        },
      },
    },
    legend: {
      position: "bottom" as const,
      fontSize: "13px",
      fontWeight: 500,
      labels: {
        colors: theme.foreground,
      },
    },
    tooltip: {
      theme: getChartTooltipTheme(isDark),
      y: {
        formatter: (val: number) => `${Math.round(val)} / 100`,
      },
    },
  };
});

const series = computed(() => [
  {
    name: props.teamName || "This Team",
    data: props.radarData?.teamScores || positions.map((p) => props.grades[p]?.score || 50),
  },
  {
    name: "League Average",
    data: props.radarData?.leagueAverages || positions.map(() => 50),
  },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Toggle View -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-foreground">
          Positional Strength & Depth
        </h3>
        <p class="text-xs text-muted-foreground">
          Relative scoring capability and league rankings normalized on a 0–100 scale.
        </p>
      </div>

      <div class="inline-flex rounded-lg border bg-muted/60 p-1">
        <button
          type="button"
          @click="viewMode = 'radar'"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            viewMode === 'radar'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          Radar Overview
        </button>
        <button
          type="button"
          @click="viewMode = 'bars'"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            viewMode === 'bars'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          Score Breakdown
        </button>
      </div>
    </div>

    <!-- Radar Chart View -->
    <div
      v-if="viewMode === 'radar'"
      class="rounded-xl border bg-card p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px]"
    >
      <div class="w-full max-w-lg">
        <apexchart
          type="radar"
          height="320"
          :options="chartOptions"
          :series="series"
        />
      </div>
    </div>

    <!-- Positional Detail Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="pos in positions"
        :key="pos"
        class="p-4 border transition-colors hover:border-foreground/20 flex flex-col justify-between"
      >
        <div>
          <!-- Card Top Bar: Position + Grade + Rank -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 rounded-md bg-muted flex items-center justify-center font-bold text-xs">
                {{ pos }}
              </div>
              <div>
                <h4 class="text-sm font-semibold text-foreground">
                  {{ positionLabels[pos] }}
                </h4>
                <p class="text-[11px] text-muted-foreground">
                  Rank #{{ grades[pos]?.rank }} in League
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <Badge
                variant="outline"
                :class="['text-xs font-bold px-2 py-0.5 border', getGradeColorClass(grades[pos]?.letterGrade || 'C')]"
              >
                {{ grades[pos]?.letterGrade || "C" }}
              </Badge>
            </div>
          </div>

          <!-- Progress Bar & Numerical Score -->
          <div class="space-y-1.5 mb-3">
            <div class="flex items-center justify-between text-xs font-medium">
              <span class="text-muted-foreground">Strength Score</span>
              <span class="text-foreground font-semibold">{{ grades[pos]?.score }}/100</span>
            </div>
            <div class="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="[
                  grades[pos]?.score >= 75
                    ? 'bg-emerald-500'
                    : grades[pos]?.score >= 50
                      ? 'bg-blue-500'
                      : grades[pos]?.score >= 40
                        ? 'bg-amber-500'
                        : 'bg-destructive',
                ]"
                :style="{ width: `${grades[pos]?.score || 50}%` }"
              />
            </div>
          </div>

          <!-- Key Scoring Stats -->
          <div class="grid grid-cols-2 gap-2 p-2 rounded-lg bg-muted/40 text-xs mb-3">
            <div>
              <div class="text-[10px] uppercase font-semibold text-muted-foreground">
                Team PPG
              </div>
              <div class="font-bold text-foreground">
                {{ grades[pos]?.ppg }} <span class="text-[10px] font-normal text-muted-foreground">pts</span>
              </div>
            </div>
            <div>
              <div class="text-[10px] uppercase font-semibold text-muted-foreground">
                League Avg
              </div>
              <div class="font-semibold text-muted-foreground">
                {{ grades[pos]?.leagueAvgPpg }} <span class="text-[10px] font-normal">pts</span>
              </div>
            </div>
          </div>

          <!-- Key Starters / Players -->
          <div v-if="grades[pos]?.keyStarters?.length" class="space-y-1.5 mb-2">
            <div class="text-[11px] font-medium text-muted-foreground">
              Key Contributors:
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(starter, idx) in grades[pos]?.keyStarters"
                :key="idx"
                class="inline-flex items-center gap-1.5 text-[11px] bg-background border px-2 py-0.5 rounded text-foreground font-medium shadow-2xs"
              >
                <PlayerAvatar
                  :player-id="starter.playerId"
                  :name="starter.name"
                  :team="starter.team"
                  :position="pos"
                  size="xs"
                />
                <span>{{ starter.name }}</span>
                <span class="text-muted-foreground text-[10px]">({{ starter.points }} pts)</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Tier Status Badge -->
        <div class="pt-2 border-t mt-2 flex items-center justify-between">
          <span class="text-[11px] text-muted-foreground">Position Status</span>
          <Badge
            variant="outline"
            :class="['text-[10px] font-semibold border', getTierColorClass(grades[pos]?.tier || 'Average')]"
          >
            {{ grades[pos]?.tier }}
          </Badge>
        </div>
      </Card>
    </div>
  </div>
</template>
