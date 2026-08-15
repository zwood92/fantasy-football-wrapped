<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "@/store/store";
import type { TableDataType } from "@/types/types";
import {
  analyzeTeam,
  type FullTeamAnalysis,
  type PositionKey,
} from "@/lib/teamAnalysisEngine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import PositionalStrengthRadar from "./PositionalStrengthRadar.vue";
import TeamRosterDiagnostic from "./TeamRosterDiagnostic.vue";

const props = defineProps<{
  open: boolean;
  selectedTeam: TableDataType | null;
  allTeams: TableDataType[];
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "selectTeam", team: TableDataType): void;
}>();

const store = useStore();
const activeTab = ref("overview");
const currentRosterId = ref<number | null>(null);

watch(
  () => props.selectedTeam,
  (team) => {
    if (team) {
      currentRosterId.value = team.rosterId;
    }
  },
  { immediate: true }
);

const currentTeam = computed<TableDataType | null>(() => {
  if (currentRosterId.value != null) {
    const found = props.allTeams.find(
      (t) => t.rosterId === currentRosterId.value
    );
    if (found) return found;
  }
  return props.selectedTeam || props.allTeams[0] || null;
});

const analysis = computed<FullTeamAnalysis | null>(() => {
  if (!currentTeam.value || props.allTeams.length === 0) return null;
  return analyzeTeam(currentTeam.value, props.allTeams, store.currentLeague);
});

const teamDisplayName = computed(() => {
  if (!currentTeam.value) return "Team Analysis";
  if (store.showUsernames && currentTeam.value.username) {
    return currentTeam.value.username;
  }
  return currentTeam.value.name || currentTeam.value.username || "Team Analysis";
});

const handleTeamChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const rosterId = Number(target.value);
  currentRosterId.value = rosterId;
  const team = props.allTeams.find((t) => t.rosterId === rosterId);
  if (team) {
    emit("selectTeam", team);
  }
};

const getLuckBadgeClass = (grade: string) => {
  if (grade === "Luck God" || grade === "Fortunate") {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  if (grade === "Neutral") {
    return "bg-muted text-muted-foreground border-border";
  }
  return "bg-destructive/15 text-destructive border-destructive/30";
};

const getDifficultyBadgeClass = (diff: string) => {
  if (diff === "Easy" || diff === "Cake Walk") {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  if (diff === "Neutral" || diff === "Average") {
    return "bg-muted text-muted-foreground border-border";
  }
  return "bg-destructive/15 text-destructive border-destructive/30";
};
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent
      class="max-w-4xl! max-h-[92vh]! p-0 overflow-hidden flex flex-col bg-background border"
    >
      <!-- Modal Header with Team Identity & Quick Team Switcher -->
      <div class="px-6 py-4 border-b bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-muted border flex items-center justify-center font-bold text-foreground overflow-hidden text-sm shrink-0">
            <img
              v-if="currentTeam?.avatarImg"
              :src="currentTeam.avatarImg"
              :alt="teamDisplayName"
              class="w-full h-full object-cover"
            />
            <span v-else>{{ teamDisplayName.slice(0, 2).toUpperCase() }}</span>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <DialogTitle class="text-lg font-bold text-foreground">
                {{ teamDisplayName }}
              </DialogTitle>
              <Badge variant="outline" class="text-xs font-semibold">
                Rank #{{ currentTeam?.regularSeasonRank || 1 }}
              </Badge>
            </div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>Record: <strong class="text-foreground">{{ currentTeam?.wins }}-{{ currentTeam?.losses }}</strong></span>
              <span>•</span>
              <span>Points For: <strong class="text-foreground">{{ currentTeam?.pointsFor }}</strong></span>
              <span>•</span>
              <span>Efficiency: <strong class="text-foreground">{{ ((currentTeam?.managerEfficiency || 0) * 100).toFixed(1) }}%</strong></span>
            </div>
          </div>
        </div>

        <!-- Manager Quick Switcher -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <label for="team-switcher" class="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
            Switch Team:
          </label>
          <select
            id="team-switcher"
            :value="currentTeam?.rosterId"
            @change="handleTeamChange"
            class="w-full sm:w-48 text-xs h-8 px-2.5 rounded-md border bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          >
            <option
              v-for="t in allTeams"
              :key="t.rosterId"
              :value="t.rosterId"
            >
              #{{ t.regularSeasonRank }} {{ store.showUsernames ? (t.username || t.name) : (t.name || t.username) }} ({{ t.wins }}-{{ t.losses }})
            </option>
          </select>
        </div>
      </div>

      <!-- Main Tabs Navigation & Content -->
      <div v-if="analysis" class="flex-1 overflow-y-auto p-4 sm:p-6">
        <Tabs v-model="activeTab" class="w-full">
          <TabsList class="grid grid-cols-5 w-full mb-6">
            <TabsTrigger value="overview" class="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="grades" class="text-xs">
              Positional Grades
            </TabsTrigger>
            <TabsTrigger value="consistency" class="text-xs">
              Volatility
            </TabsTrigger>
            <TabsTrigger value="luck" class="text-xs">
              Luck & Schedule
            </TabsTrigger>
            <TabsTrigger value="diagnostics" class="text-xs">
              Diagnostics
            </TabsTrigger>
          </TabsList>

          <!-- Tab 1: Overview -->
          <TabsContent value="overview" class="space-y-6 focus-visible:outline-hidden">
            <!-- AI Team Outlook / Executive Summary -->
            <Card class="p-4 sm:p-5 border bg-muted/30">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-primary">
                  Executive Outlook
                </span>
                <Badge variant="outline" class="text-[10px]">
                  Power Rating: {{ analysis.diagnostics.overallRating }} / 100
                </Badge>
              </div>
              <p class="text-xs sm:text-sm text-foreground leading-relaxed">
                {{ analysis.diagnostics.aiOutlook }}
              </p>
            </Card>

            <!-- 4 Core Metrics Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card class="p-4 border bg-card">
                <div class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Power Score
                </div>
                <div class="text-2xl font-bold text-foreground">
                  {{ analysis.diagnostics.overallRating }} <span class="text-xs font-normal text-muted-foreground">/100</span>
                </div>
                <div class="text-[11px] text-muted-foreground mt-1">
                  Rank #{{ analysis.diagnostics.powerRank }} in Power Index
                </div>
              </Card>

              <Card class="p-4 border bg-card">
                <div class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Luck Differential
                </div>
                <div class="text-2xl font-bold" :class="analysis.luck.luckDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">
                  {{ analysis.luck.luckDelta >= 0 ? `+${analysis.luck.luckDelta}` : analysis.luck.luckDelta }} <span class="text-xs font-normal text-muted-foreground">wins</span>
                </div>
                <div class="text-[11px] text-muted-foreground mt-1">
                  {{ analysis.luck.luckGrade }}
                </div>
              </Card>

              <Card class="p-4 border bg-card">
                <div class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Lineup Efficiency
                </div>
                <div class="text-2xl font-bold text-foreground">
                  {{ analysis.efficiency.efficiencyPercentage }}%
                </div>
                <div class="text-[11px] text-muted-foreground mt-1">
                  Rank #{{ analysis.efficiency.efficiencyRank }} (Grade: {{ analysis.efficiency.efficiencyGrade }})
                </div>
              </Card>

              <Card class="p-4 border bg-card">
                <div class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Playoff Odds
                </div>
                <div class="text-2xl font-bold text-foreground">
                  {{ analysis.playoffPath.playoffProbability }}%
                </div>
                <div class="text-[11px] text-muted-foreground mt-1">
                  Status: {{ analysis.playoffPath.clinchStatus }}
                </div>
              </Card>
            </div>

            <!-- Strengths & Weaknesses Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card class="p-4 border bg-card">
                <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                  <span>✓</span> Core Strengths
                </h4>
                <ul class="space-y-2 text-xs text-foreground">
                  <li
                    v-for="(str, idx) in analysis.diagnostics.strengths"
                    :key="idx"
                    class="flex items-start gap-2"
                  >
                    <span class="text-emerald-500 font-bold">•</span>
                    <span>{{ str }}</span>
                  </li>
                </ul>
              </Card>

              <Card class="p-4 border bg-card">
                <h4 class="text-xs font-bold uppercase tracking-wider text-destructive mb-3 flex items-center gap-1.5">
                  <span>⚠</span> Vulnerabilities
                </h4>
                <ul class="space-y-2 text-xs text-foreground">
                  <li
                    v-for="(weak, idx) in analysis.diagnostics.weaknesses"
                    :key="idx"
                    class="flex items-start gap-2"
                  >
                    <span class="text-destructive font-bold">•</span>
                    <span>{{ weak }}</span>
                  </li>
                </ul>
              </Card>
            </div>

            <!-- Actionable Recommendations -->
            <Card class="p-4 border bg-card">
              <h4 class="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                Manager Recommendations & Trade Targets
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  v-for="(rec, idx) in analysis.diagnostics.recommendations"
                  :key="idx"
                  class="p-3 rounded-lg border bg-muted/20 text-xs text-foreground flex items-start gap-2.5"
                >
                  <span class="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                    {{ idx + 1 }}
                  </span>
                  <span>{{ rec }}</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <!-- Tab 2: Positional Grades -->
          <TabsContent value="grades" class="focus-visible:outline-hidden">
            <PositionalStrengthRadar
              :grades="analysis.positionalGrades"
              :radar-data="analysis.positionalRadarData"
              :team-name="teamDisplayName"
            />
          </TabsContent>

          <!-- Tab 3: Consistency & Volatility -->
          <TabsContent value="consistency" class="focus-visible:outline-hidden">
            <TeamRosterDiagnostic
              :consistency="analysis.consistency"
              :efficiency="analysis.efficiency"
              :alerts="analysis.diagnostics.rosterAlerts"
              :team-name="teamDisplayName"
            />
          </TabsContent>

          <!-- Tab 4: Luck & Schedule Analysis -->
          <TabsContent value="luck" class="space-y-6 focus-visible:outline-hidden">
            <!-- Luck Overview Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card class="p-4 border bg-card">
                <div class="text-[11px] uppercase font-semibold text-muted-foreground mb-1">
                  Actual vs Expected Wins
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-bold text-foreground">{{ analysis.luck.actualWins }}</span>
                  <span class="text-xs text-muted-foreground">actual vs</span>
                  <span class="text-2xl font-bold text-muted-foreground">{{ analysis.luck.expectedWins }}</span>
                  <span class="text-xs text-muted-foreground">exp</span>
                </div>
                <div class="mt-2 flex items-center gap-2">
                  <Badge variant="outline" :class="getLuckBadgeClass(analysis.luck.luckGrade)">
                    {{ analysis.luck.luckGrade }}
                  </Badge>
                  <span class="text-xs text-muted-foreground font-medium">
                    {{ analysis.luck.luckDelta >= 0 ? `+${analysis.luck.luckDelta}` : analysis.luck.luckDelta }} win diff
                  </span>
                </div>
              </Card>

              <Card class="p-4 border bg-card">
                <div class="text-[11px] uppercase font-semibold text-muted-foreground mb-1">
                  Points Against Variance
                </div>
                <div class="text-2xl font-bold text-foreground">
                  {{ analysis.luck.pointsAgainst }} <span class="text-xs font-normal text-muted-foreground">PA</span>
                </div>
                <div class="text-[11px] text-muted-foreground mt-1">
                  Rank #{{ analysis.luck.pointsAgainstRank }} toughest schedule ({{ analysis.luck.pointsAgainstDiff >= 0 ? `+${analysis.luck.pointsAgainstDiff}` : analysis.luck.pointsAgainstDiff }} vs league avg)
                </div>
              </Card>

              <Card class="p-4 border bg-card">
                <div class="text-[11px] uppercase font-semibold text-muted-foreground mb-1">
                  Remaining Schedule Strength
                </div>
                <div class="text-2xl font-bold text-foreground">
                  {{ analysis.playoffPath.remainingScheduleStrength }}
                </div>
                <div class="text-[11px] text-muted-foreground mt-1">
                  {{ analysis.playoffPath.remainingOpponents.length }} regular season games remaining
                </div>
              </Card>
            </div>

            <!-- Schedule Explanation Card -->
            <Card class="p-4 border bg-muted/30 text-xs leading-relaxed text-foreground">
              <span class="font-semibold">Schedule Luck Assessment: </span>
              {{ analysis.luck.explanation }}
            </Card>

            <!-- Remaining Matchups Table -->
            <Card class="p-4 border bg-card">
              <h4 class="text-sm font-semibold text-foreground mb-3">
                Remaining Matchup Difficulty
              </h4>

              <div v-if="analysis.playoffPath.remainingOpponents.length > 0" class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                  <thead class="text-[11px] uppercase bg-muted/50 border-b">
                    <tr>
                      <th class="px-3 py-2">Week</th>
                      <th class="px-3 py-2">Opponent</th>
                      <th class="px-3 py-2">Record</th>
                      <th class="px-3 py-2">Rank</th>
                      <th class="px-3 py-2">Opp PPG</th>
                      <th class="px-3 py-2">Matchup Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="opp in analysis.playoffPath.remainingOpponents"
                      :key="opp.week"
                      class="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td class="px-3 py-2.5 font-bold">Week {{ opp.week }}</td>
                      <td class="px-3 py-2.5 font-medium">{{ opp.opponentName }}</td>
                      <td class="px-3 py-2.5 text-muted-foreground">{{ opp.opponentRecord }}</td>
                      <td class="px-3 py-2.5 text-muted-foreground">#{{ opp.opponentRank }}</td>
                      <td class="px-3 py-2.5 font-medium">{{ opp.opponentAvgPpg }} pts</td>
                      <td class="px-3 py-2.5">
                        <Badge variant="outline" :class="getDifficultyBadgeClass(opp.difficulty)">
                          {{ opp.difficulty }}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else class="py-6 text-center text-xs text-muted-foreground">
                Regular season complete. No remaining matchups scheduled.
              </div>
            </Card>
          </TabsContent>

          <!-- Tab 5: Diagnostics -->
          <TabsContent value="diagnostics" class="focus-visible:outline-hidden">
            <TeamRosterDiagnostic
              :consistency="analysis.consistency"
              :efficiency="analysis.efficiency"
              :alerts="analysis.diagnostics.rosterAlerts"
              :team-name="teamDisplayName"
            />
          </TabsContent>
        </Tabs>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 border-t bg-card flex justify-end">
        <button
          type="button"
          @click="emit('update:open', false)"
          class="px-4 py-1.5 text-xs font-semibold rounded-md border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
