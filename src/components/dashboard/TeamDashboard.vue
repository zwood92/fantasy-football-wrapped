<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useStore } from "@/store/store";
import { useLeagueNav } from "@/composables/useLeagueNav";
import { getPlayersByIdsMap } from "@/api/api";
import { handleImageFallback as handleImageError } from "@/lib/imageFallback";
import {
  buildTeamDashboardModel,
  type TeamDashboardModel,
} from "@/lib/dashboardMetrics";
import type { PlayerLookupRecord } from "@/lib/podcastEngine";
import type {
  TableDataType,
  TradeNameRow,
  WaiverMove,
} from "@/types/types";
import {
  fetchCachedPodcastEpisode,
  generatePodcastEpisode,
  type PodcastEpisode,
} from "@/api/aiAnalysisApi";
import {
  loadDemoLeague,
  loadDemoRosterManagement,
} from "@/data/demo/loaders";
import TeamSelector from "@/components/layout/TeamSelector.vue";
import AiNarrativeCard from "@/components/shared/AiNarrativeCard.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Mic,
  Minus,
  Radio,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "@lucide/vue";

const props = defineProps<{
  tableData: TableDataType[];
  originalData?: TableDataType[];
}>();

const store = useStore();
const { goToFeature } = useLeagueNav();

const playerMap = shallowRef<PlayerLookupRecord>({});
const demoWaivers = shallowRef<WaiverMove[]>([]);
const demoTrades = shallowRef<TradeNameRow[]>([]);
const demoLeagueFallback = shallowRef<any>(null);

const showLineupCompare = ref(false);
const inspectedWeek = ref<number | null>(null);
const showInlineEpisode = ref(false);
const isGeneratingInlineEpisode = ref(false);
const inlineEpisode = ref<PodcastEpisode | null>(null);

const hydratePlayers = async () => {
  const teams = props.tableData;
  if (!teams || teams.length === 0) return;

  if (!store.currentLeagueId) {
    try {
      const [dl, dm] = await Promise.all([
        loadDemoLeague(),
        loadDemoRosterManagement(),
      ]);
      demoWaivers.value = dm.fakeWaiverMoves;
      demoTrades.value = dm.fakeTrades as unknown as TradeNameRow[];
      demoLeagueFallback.value = {
        name: "FFWrapped Demo League",
        season: "2025",
        seasonType: "Redraft",
        totalRosters: dl.fakeUsers.length,
        playoffTeams: 6,
        regularSeasonLength: 14,
        lastScoredWeek: 14,
        currentWeek: 14,
        scoringType: 1,
        users: dl.fakeUsers,
        rosters: dl.fakeRosters,
        weeklyPoints: dl.fakePoints,
        waiverMoves: dm.fakeWaiverMoves,
        tradeNames: dm.fakeTrades,
        transactions: Object.fromEntries(
          dl.fakeUsers.map((u: any) => [u.id, u.transactions ?? 20])
        ),
      };
    } catch {
      // Non-fatal in test environments
    }
  }

  const ids = new Set<string>();
  for (const t of teams) {
    for (const weekArr of t.starters ?? []) {
      for (const id of weekArr ?? []) {
        if (id && id !== "0") ids.add(String(id));
      }
    }
    for (const weekArr of t.benchPlayers ?? []) {
      for (const id of weekArr ?? []) {
        if (id && id !== "0") ids.add(String(id));
      }
    }
  }
  for (const w of store.currentLeague?.waivers ?? []) {
    for (const id of Object.keys(w.adds ?? {})) ids.add(id);
  }

  if (ids.size === 0) return;
  try {
    const fetched = await getPlayersByIdsMap(Array.from(ids));
    const next: PlayerLookupRecord = {};
    fetched.forEach((p, id) => {
      next[id] = { name: p.name, position: p.position, team: p.team };
    });
    playerMap.value = next;
  } catch {
    // Keep graceful fallback labels if offline
  }
};

const model = computed<TeamDashboardModel | null>(() =>
  buildTeamDashboardModel({
    teams: props.tableData,
    selectedRosterId: store.currentSelectedRosterId,
    league: store.currentLeague ?? demoLeagueFallback.value,
    playerMap: playerMap.value,
    showUsernames: store.showUsernames,
    extraWaiverMoves: store.currentLeagueId ? undefined : demoWaivers.value,
    extraTradeNames: store.currentLeagueId ? undefined : demoTrades.value,
  })
);

const activeReviewWeek = computed(() => {
  const m = model.value;
  if (!m || m.weeklyReview.length === 0) return null;
  if (inspectedWeek.value !== null) {
    const found = m.weeklyReview.find((w) => w.week === inspectedWeek.value);
    if (found) return found;
  }
  return m.weeklyReview[m.weeklyReview.length - 1];
});

const maxChartScore = computed(() => {
  const m = model.value;
  if (!m || m.weeklyReview.length === 0) return 160;
  return Math.max(
    140,
    ...m.weeklyReview.map((w) => Math.max(w.score, w.leagueAverage))
  );
});

const barHeightPct = (score: number) =>
  `${Math.max(10, Math.min(100, Math.round((score / maxChartScore.value) * 100)))}%`;

const toggleInlinePodcast = async () => {
  if (showInlineEpisode.value && inlineEpisode.value) {
    showInlineEpisode.value = false;
    return;
  }
  showInlineEpisode.value = true;
  const targetWeek = model.value?.radioSpotlight.week ?? 10;
  if (inlineEpisode.value && inlineEpisode.value.week === targetWeek) return;

  isGeneratingInlineEpisode.value = true;
  try {
    const cached = await fetchCachedPodcastEpisode({
      leagueId: store.currentLeague?.leagueId,
      week: targetWeek,
    });
    if (cached) {
      inlineEpisode.value = cached;
      return;
    }
    const leagueSource = store.currentLeague ?? demoLeagueFallback.value;
    inlineEpisode.value = await generatePodcastEpisode({
      leagueInfo: leagueSource,
      matchups: leagueSource?.weeklyPoints ?? [],
      week: targetWeek,
      synthesizeAudio: true,
    });
  } finally {
    isGeneratingInlineEpisode.value = false;
  }
};

watch(
  () => [store.currentLeagueId, props.tableData.length],
  () => {
    inspectedWeek.value = null;
    inlineEpisode.value = null;
    showInlineEpisode.value = false;
    void hydratePlayers();
  }
);

onMounted(() => {
  void hydratePlayers();
});
</script>

<template>
  <div v-if="model" class="space-y-6 my-4 pb-8">
    <!-- 1. TEAM HERO CARD -->
    <div class="rounded-2xl border bg-card p-5 md:p-6 shadow-xs">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div class="flex items-start sm:items-center gap-4 min-w-0">
          <img
            :src="model.avatarImg"
            :alt="model.teamName"
            @error="handleImageError"
            class="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-primary/40 bg-secondary shrink-0 object-cover"
          />
          <div class="min-w-0 space-y-1.5">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {{ model.leagueName }} · {{ model.season }}
              </span>
              <Badge
                v-for="badge in model.scoringBadges"
                :key="badge"
                variant="secondary"
                class="text-[11px] font-medium"
              >
                {{ badge }}
              </Badge>
            </div>
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-foreground truncate">
              {{ model.teamName }}
            </h1>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between lg:justify-end gap-4">
          <div class="grid grid-cols-4 gap-3 sm:gap-5 text-center">
            <div>
              <div class="text-[11px] uppercase font-semibold text-muted-foreground">
                Record
              </div>
              <div class="text-base sm:text-lg font-black text-foreground">
                {{ model.record }}
              </div>
            </div>
            <div>
              <div class="text-[11px] uppercase font-semibold text-muted-foreground">
                Standing
              </div>
              <div class="text-base sm:text-lg font-black text-primary">
                #{{ model.standing }}
              </div>
            </div>
            <div>
              <div class="text-[11px] uppercase font-semibold text-muted-foreground">
                Power
              </div>
              <div class="text-base sm:text-lg font-black text-foreground">
                #{{ model.powerRank }}
              </div>
            </div>
            <div>
              <div class="text-[11px] uppercase font-semibold text-muted-foreground">
                Points
              </div>
              <div class="text-base sm:text-lg font-black text-foreground">
                {{ model.pointsFor }}
              </div>
            </div>
          </div>

          <TeamSelector :teams="tableData" label="Team" />
        </div>
      </div>
    </div>

    <!-- 2. WHAT CHANGED THIS WEEK (4-DELTA STRIP) -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between px-0.5">
        <h2 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          What Changed Through Week {{ model.latestWeek }}
        </h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <button
          v-for="delta in model.deltas"
          :key="delta.id"
          type="button"
          @click="goToFeature(delta.targetFeature)"
          class="group text-left rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:bg-secondary/20 cursor-pointer"
        >
          <div class="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>{{ delta.label }}</span>
            <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </div>
          <div class="mt-1.5 flex items-baseline justify-between gap-2">
            <span class="text-2xl font-black tracking-tight text-foreground">
              {{ delta.currentDisplay }}
            </span>
            <span
              class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold"
              :class="
                delta.direction === 'up'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : delta.direction === 'down'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-secondary text-muted-foreground'
              "
            >
              <ArrowUpRight v-if="delta.direction === 'up'" class="w-3.5 h-3.5" />
              <ArrowDownRight v-else-if="delta.direction === 'down'" class="w-3.5 h-3.5" />
              <Minus v-else class="w-3 h-3" />
              {{ delta.deltaLabel }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- 3. WEEKLY 3-HOST AI RADIO BOOTH SPOTLIGHT -->
    <div class="rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-5 md:p-6 shadow-xs space-y-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground">
              <Radio class="w-3.5 h-3.5 animate-pulse" />
              98.7 League Radio Desk
            </span>
            <Badge variant="outline" class="text-xs gap-1">
              <Clock class="w-3 h-3" />
              Full 8–10 Min Weekly Show Available
            </Badge>
          </div>
          <h2 class="text-lg md:text-xl font-black tracking-tight text-foreground">
            {{ model.radioSpotlight.headline }}
          </h2>
        </div>

        <div class="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            size="sm"
            class="gap-1.5 font-bold text-xs"
            :disabled="isGeneratingInlineEpisode"
            @click="toggleInlinePodcast"
          >
            <Mic class="w-3.5 h-3.5" :class="isGeneratingInlineEpisode ? 'animate-spin' : ''" />
            {{
              isGeneratingInlineEpisode
                ? "Recording 6-Act Show..."
                : showInlineEpisode
                  ? "Hide Full Script"
                  : `Play Full Week ${model.radioSpotlight.week} Show (8–10m)`
            }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5 text-xs font-semibold"
            @click="goToFeature('Podcast', { week: model.radioSpotlight.week })"
          >
            Open Radio Studio
            <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <!-- 3-Host Quick Teaser Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div
          v-for="(line, idx) in model.radioSpotlight.teaserLines"
          :key="idx"
          class="rounded-xl border bg-background/80 p-3.5 space-y-2"
          :class="
            line.speaker === 'Analytical Guru'
              ? 'border-sky-500/25'
              : line.speaker === 'Comedian'
                ? 'border-amber-500/25'
                : 'border-emerald-500/25'
          "
        >
          <div class="flex items-center gap-2.5">
            <img
              :src="line.avatar"
              :alt="line.speaker"
              class="w-8 h-8 rounded-full border bg-secondary"
            />
            <div class="min-w-0">
              <div
                class="text-xs font-black uppercase truncate"
                :class="
                  line.speaker === 'Analytical Guru'
                    ? 'text-sky-500'
                    : line.speaker === 'Comedian'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                "
              >
                {{ line.characterName || line.speaker }}
              </div>
              <div class="text-[10px] text-muted-foreground font-medium truncate">
                {{ line.topic }}
              </div>
            </div>
          </div>
          <p class="text-xs leading-relaxed text-foreground">
            "{{ line.text }}"
          </p>
        </div>
      </div>

      <!-- Inline Expandable Full 8-10 Min Episode -->
      <div v-if="showInlineEpisode && inlineEpisode" class="pt-3 border-t border-border/60">
        <AiNarrativeCard
          :title="inlineEpisode.title"
          :subtitle="inlineEpisode.subtitle"
          :badge-text="`Week ${inlineEpisode.week} Full Broadcast`"
          :lines="inlineEpisode.segments"
          :acts="inlineEpisode.acts"
          :word-count="inlineEpisode.wordCount"
          :estimated-duration-minutes="inlineEpisode.estimatedDurationMinutes"
          :audio-url="inlineEpisode.audioUrl"
          :summary="inlineEpisode.summary"
          :highlights="inlineEpisode.highlights"
          :is-mock="inlineEpisode.isMock"
          :allow-speech="true"
        />
      </div>
    </div>

    <!-- 4. MATCHUP & LINEUP INSIGHT -->
    <div v-if="model.latestMatchup" class="rounded-2xl border bg-card p-5 md:p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Week {{ model.latestMatchup.week }} Matchup & Lineup
          </span>
          <h2 class="text-lg font-bold text-foreground">
            {{ model.teamName }} vs. {{ model.latestMatchup.opponentName }}
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs h-8"
            @click="goToFeature('Start/Sit')"
          >
            Get Start/Sit Advice
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="text-xs h-8 gap-1"
            @click="goToFeature('Weekly Report')"
          >
            Week {{ model.latestMatchup.week }} Report
            <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <!-- Scoreboard Strip -->
      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl border bg-secondary/20 p-4">
        <div class="flex items-center justify-between md:justify-start gap-3">
          <img
            :src="model.avatarImg"
            :alt="model.teamName"
            @error="handleImageError"
            class="w-10 h-10 rounded-full border bg-secondary"
          />
          <div class="min-w-0">
            <div class="font-bold text-sm truncate">{{ model.teamName }}</div>
            <div class="text-xs text-muted-foreground">
              Weekly Rank #{{ model.latestMatchup.weeklyRank }} of {{ model.totalTeams }}
            </div>
          </div>
          <div class="md:ml-auto text-2xl font-black text-foreground">
            {{ model.latestMatchup.score.toFixed(1) }}
          </div>
        </div>

        <div class="flex flex-col items-center justify-center">
          <span
            class="px-2.5 py-0.5 rounded-full text-xs font-black uppercase"
            :class="
              model.latestMatchup.result === 'W'
                ? 'bg-emerald-500/15 text-emerald-500'
                : model.latestMatchup.result === 'L'
                  ? 'bg-red-500/15 text-red-500'
                  : 'bg-secondary text-muted-foreground'
            "
          >
            {{
              model.latestMatchup.result === "W"
                ? `Won by ${model.latestMatchup.margin.toFixed(1)}`
                : model.latestMatchup.result === "L"
                  ? `Lost by ${model.latestMatchup.margin.toFixed(1)}`
                  : "Tied"
            }}
          </span>
        </div>

        <div class="flex items-center justify-between md:justify-end gap-3">
          <div class="md:mr-auto text-2xl font-black text-muted-foreground">
            {{ model.latestMatchup.opponentScore.toFixed(1) }}
          </div>
          <div class="min-w-0 text-right">
            <div class="font-bold text-sm truncate">
              {{ model.latestMatchup.opponentName }}
            </div>
            <div class="text-xs text-muted-foreground">Opponent</div>
          </div>
          <img
            :src="model.latestMatchup.opponentAvatar"
            :alt="model.latestMatchup.opponentName"
            @error="handleImageError"
            class="w-10 h-10 rounded-full border bg-secondary"
          />
        </div>
      </div>

      <!-- Lineup Insight Banner -->
      <div
        class="flex items-start sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-xs"
        :class="
          model.lineupInsight.benchSwapCandidate?.wouldFlipResult
            ? 'border-amber-500/40 bg-amber-500/10 text-foreground'
            : 'border-border/70 bg-background/60 text-muted-foreground'
        "
      >
        <div class="flex items-start sm:items-center gap-2.5">
          <AlertTriangle
            v-if="model.lineupInsight.benchSwapCandidate"
            class="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0"
          />
          <CheckCircle2
            v-else
            class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0"
          />
          <span class="font-medium leading-relaxed text-foreground">
            {{ model.lineupInsight.headline }}
          </span>
        </div>

        <Button
          v-if="model.latestMatchup.starters.length > 0"
          type="button"
          variant="ghost"
          size="sm"
          class="shrink-0 h-7 text-xs gap-1"
          @click="showLineupCompare = !showLineupCompare"
        >
          {{ showLineupCompare ? "Hide Lineups" : "Compare Both Lineups" }}
          <component :is="showLineupCompare ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
        </Button>
      </div>

      <!-- Expandable Lineup Comparison -->
      <div
        v-if="showLineupCompare && model.latestMatchup.starters.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
      >
        <div class="rounded-xl border p-3.5 space-y-2">
          <div class="text-xs font-bold uppercase text-primary">
            {{ model.teamName }} Starters
          </div>
          <div
            v-for="(slot, sIdx) in model.latestMatchup.starters"
            :key="sIdx"
            class="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-border/40"
          >
            <div class="flex items-center gap-2 min-w-0">
              <Badge variant="outline" class="text-[10px] px-1.5 py-0 shrink-0">
                {{ slot.position }}
              </Badge>
              <span class="truncate font-medium">{{ slot.name }}</span>
            </div>
            <span class="font-bold tabular-nums">{{ slot.points.toFixed(1) }}</span>
          </div>
        </div>

        <div class="rounded-xl border p-3.5 space-y-2">
          <div class="text-xs font-bold uppercase text-muted-foreground">
            {{ model.latestMatchup.opponentName }} Starters
          </div>
          <div
            v-for="(slot, sIdx) in model.latestMatchup.opponentStarters"
            :key="sIdx"
            class="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-border/40"
          >
            <div class="flex items-center gap-2 min-w-0">
              <Badge variant="outline" class="text-[10px] px-1.5 py-0 shrink-0">
                {{ slot.position }}
              </Badge>
              <span class="truncate font-medium">{{ slot.name }}</span>
            </div>
            <span class="font-bold tabular-nums">{{ slot.points.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. INTERACTIVE MATCHUP REVIEW (WEEKLY BAR INSPECTOR) -->
    <div v-if="model.weeklyReview.length > 0" class="rounded-2xl border bg-card p-5 md:p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Season Scoring Trajectory
          </span>
          <h2 class="text-lg font-bold text-foreground">
            Matchup Review (Click Any Week)
          </h2>
        </div>
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Win
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-xs bg-red-500/80 inline-block" /> Loss
          </span>
          <span>Avg PPG: <strong class="text-foreground">{{ model.ppg }}</strong></span>
        </div>
      </div>

      <!-- Interactive Week Bars -->
      <div class="grid grid-flow-col auto-cols-fr gap-1.5 sm:gap-2.5 items-end h-36 pt-4 px-1 border-b border-border/60">
        <button
          v-for="wk in model.weeklyReview"
          :key="wk.week"
          type="button"
          @click="inspectedWeek = wk.week"
          class="group flex flex-col items-center justify-end h-full gap-1.5 focus:outline-hidden cursor-pointer"
        >
          <span class="text-[10px] font-bold tabular-nums text-muted-foreground group-hover:text-foreground">
            {{ Math.round(wk.score) }}
          </span>
          <div class="w-full max-w-[34px] flex items-end justify-center h-24 relative">
            <div
              class="w-full rounded-t-md transition-all"
              :style="{ height: barHeightPct(wk.score) }"
              :class="[
                wk.result === 'W' ? 'bg-emerald-500/85' : 'bg-red-500/75',
                activeReviewWeek?.week === wk.week
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-card opacity-100'
                  : 'opacity-75 group-hover:opacity-100',
              ]"
            />
          </div>
          <span
            class="text-[11px] pb-1 font-semibold"
            :class="
              activeReviewWeek?.week === wk.week
                ? 'text-primary font-black'
                : 'text-muted-foreground'
            "
          >
            W{{ wk.week }}
          </span>
        </button>
      </div>

      <!-- Selected Week Detail Strip -->
      <div
        v-if="activeReviewWeek"
        class="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl bg-secondary/25 border border-border/60 p-3.5 text-xs"
      >
        <div>
          <div class="text-muted-foreground">Week {{ activeReviewWeek.week }} Result</div>
          <div
            class="font-black text-sm mt-0.5"
            :class="
              activeReviewWeek.result === 'W'
                ? 'text-emerald-500'
                : 'text-red-500'
            "
          >
            {{ activeReviewWeek.result }} ({{ activeReviewWeek.score.toFixed(1) }}–{{ activeReviewWeek.opponentScore.toFixed(1) }})
          </div>
        </div>
        <div>
          <div class="text-muted-foreground">Opponent</div>
          <div class="font-bold text-sm mt-0.5 truncate">
            {{ activeReviewWeek.opponentName }}
          </div>
        </div>
        <div>
          <div class="text-muted-foreground">Weekly Rank</div>
          <div class="font-bold text-sm mt-0.5">
            #{{ activeReviewWeek.weeklyRank }} of {{ activeReviewWeek.totalTeams }}
          </div>
        </div>
        <div>
          <div class="text-muted-foreground">League Average</div>
          <div class="font-bold text-sm mt-0.5">
            {{ activeReviewWeek.leagueAverage.toFixed(1) }} pts
          </div>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <div class="text-muted-foreground">Top Starter</div>
          <div class="font-bold text-sm mt-0.5 truncate">
            <template v-if="activeReviewWeek.topStarter">
              {{ activeReviewWeek.topStarter.name }} ({{ activeReviewWeek.topStarter.points.toFixed(1) }})
            </template>
            <template v-else>—</template>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. TWO-COLUMN GRID: TEAM HIGHLIGHTS + PLAYOFF PATH -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <!-- Team Highlights -->
      <div class="rounded-2xl border bg-card p-5 md:p-6 shadow-xs space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Roster DNA
            </span>
            <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
              <Award class="w-4 h-4 text-primary" />
              Team Highlights & Construction
            </h2>
          </div>
          <Badge variant="outline" class="text-xs">
            {{ model.efficiencyPct }}% Lineup Efficiency
          </Badge>
        </div>

        <!-- How Your Team Was Built -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span>How Your Starter Points Were Built</span>
            <span class="text-muted-foreground">
              {{ model.rosterBuild.totalStarterPoints }} starter pts
            </span>
          </div>
          <div class="h-3 w-full rounded-full overflow-hidden flex bg-secondary">
            <div
              class="bg-primary h-full transition-all"
              :style="{ width: `${model.rosterBuild.draftedPct}%` }"
              title="Drafted"
            />
            <div
              class="bg-emerald-500 h-full transition-all"
              :style="{ width: `${model.rosterBuild.pickupPct}%` }"
              title="Pickups"
            />
            <div
              class="bg-amber-500 h-full transition-all"
              :style="{ width: `${model.rosterBuild.tradePct}%` }"
              title="Trades"
            />
          </div>
          <div class="grid grid-cols-3 gap-2 text-xs pt-1">
            <div class="rounded-lg border p-2.5 bg-background/50">
              <div class="text-muted-foreground flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-primary" /> Drafted
              </div>
              <div class="font-black text-sm mt-0.5">
                {{ model.rosterBuild.draftedPct }}%
              </div>
            </div>
            <div class="rounded-lg border p-2.5 bg-background/50">
              <div class="text-muted-foreground flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500" /> Waivers/FA
              </div>
              <div class="font-black text-sm mt-0.5">
                {{ model.rosterBuild.pickupPct }}%
              </div>
            </div>
            <div class="rounded-lg border p-2.5 bg-background/50">
              <div class="text-muted-foreground flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-500" /> Trades
              </div>
              <div class="font-black text-sm mt-0.5">
                {{ model.rosterBuild.tradePct }}%
              </div>
            </div>
          </div>
        </div>

        <!-- Team MVPs -->
        <div v-if="model.mvps.length > 0" class="space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Season Starter MVPs
          </div>
          <div class="divide-y divide-border/50 rounded-xl border px-3.5">
            <div
              v-for="(mvp, idx) in model.mvps"
              :key="mvp.playerId"
              class="flex items-center justify-between py-2.5 text-xs"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="font-black text-muted-foreground w-4">
                  {{ idx + 1 }}.
                </span>
                <Badge variant="secondary" class="text-[10px] px-1.5 py-0">
                  {{ mvp.position }}
                </Badge>
                <span class="font-bold text-foreground truncate">
                  {{ mvp.name }}
                </span>
              </div>
              <div class="text-right shrink-0">
                <span class="font-black text-foreground">{{ mvp.totalPoints }} pts</span>
                <span class="text-muted-foreground ml-1.5">
                  ({{ mvp.starts }} starts · {{ mvp.ppg }} PPG)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Playoff Path & Next Matchups -->
      <div class="rounded-2xl border bg-card p-5 md:p-6 shadow-xs space-y-5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Postseason Trajectory
            </span>
            <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy class="w-4 h-4 text-primary" />
              Playoff Path & Upcoming Slate
            </h2>
          </div>
          <Badge
            :variant="
              model.playoffPath.playoffOddsPct >= 65 ? 'default' : 'secondary'
            "
            class="text-xs font-bold"
          >
            {{ model.playoffPath.statusLabel }}
          </Badge>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-xl border bg-secondary/20 p-3">
            <div class="text-[11px] uppercase text-muted-foreground font-semibold">
              Playoff Odds
            </div>
            <div class="text-2xl font-black text-primary mt-0.5">
              {{ model.playoffPath.playoffOddsPct }}%
            </div>
          </div>
          <div class="rounded-xl border bg-secondary/20 p-3">
            <div class="text-[11px] uppercase text-muted-foreground font-semibold">
              Proj. Wins
            </div>
            <div class="text-2xl font-black text-foreground mt-0.5">
              {{ model.playoffPath.projectedWins }}
            </div>
          </div>
          <div class="rounded-xl border bg-secondary/20 p-3">
            <div class="text-[11px] uppercase text-muted-foreground font-semibold">
              Schedule Luck
            </div>
            <div
              class="text-2xl font-black mt-0.5"
              :class="
                model.playoffPath.luckDelta > 0
                  ? 'text-emerald-500'
                  : model.playoffPath.luckDelta < 0
                    ? 'text-amber-500'
                    : 'text-foreground'
              "
            >
              {{ model.playoffPath.luckDelta > 0 ? "+" : "" }}{{ model.playoffPath.luckDelta }}W
            </div>
          </div>
        </div>

        <!-- Next 3 Matchups -->
        <div v-if="model.playoffPath.nextMatchups.length > 0" class="space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Next Scheduled Opponents
          </div>
          <div class="space-y-2">
            <div
              v-for="nm in model.playoffPath.nextMatchups"
              :key="nm.week"
              class="flex items-center justify-between rounded-xl border p-3 text-xs"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="font-bold text-muted-foreground w-12 shrink-0">
                  Week {{ nm.week }}
                </span>
                <img
                  :src="nm.opponentAvatar"
                  :alt="nm.opponentName"
                  @error="handleImageError"
                  class="w-7 h-7 rounded-full border bg-secondary shrink-0"
                />
                <div class="min-w-0">
                  <div class="font-bold text-foreground truncate">
                    {{ nm.opponentName }}
                  </div>
                  <div class="text-[11px] text-muted-foreground">
                    #{{ nm.opponentRank }} · {{ nm.opponentRecord }} · {{ nm.opponentPpg }} PPG
                  </div>
                </div>
              </div>
              <span
                class="px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0"
                :class="
                  nm.difficulty === 'Tough'
                    ? 'bg-red-500/10 text-red-500'
                    : nm.difficulty === 'Favorable'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-secondary text-muted-foreground'
                "
              >
                {{ nm.difficulty }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          Regular-season schedule complete. Check final bracket outcomes in Playoffs!
        </div>

        <div class="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs h-8 gap-1.5"
            @click="goToFeature('Season Forecast')"
          >
            Simulate Remaining Schedule
            <ArrowRight class="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="text-xs h-8 gap-1"
            @click="goToFeature('Playoffs')"
          >
            Full Playoff Picture
            <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>

    <!-- 7. ROSTER ACTIVITY: BEST ADDITIONS & QUESTIONABLE MOVES -->
    <div class="rounded-2xl border bg-card p-5 md:p-6 shadow-xs space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Front Office Ledger
          </span>
          <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
            <Users class="w-4 h-4 text-primary" />
            Roster Activity & Waiver ROI
          </h2>
        </div>

        <div class="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="secondary">
            {{ model.rosterActivity.totalMoves }} Total Moves (#{{ model.rosterActivity.activityRank }} of {{ model.totalTeams }})
          </Badge>
          <Badge variant="outline">
            {{ model.rosterActivity.tradesCount }} Trades
          </Badge>
          <Badge v-if="model.rosterActivity.faabSpent > 0" variant="outline">
            ${{ model.rosterActivity.faabSpent }} FAAB Spent
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 text-xs gap-1"
            @click="goToFeature('Roster Management')"
          >
            All League Moves
            <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Best Additions -->
        <div class="rounded-xl border p-4 space-y-2.5">
          <div class="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
            <TrendingUp class="w-3.5 h-3.5" />
            Best Waiver / FA Additions
          </div>
          <div v-if="model.rosterActivity.bestAdditions.length > 0" class="space-y-2">
            <div
              v-for="add in model.rosterActivity.bestAdditions"
              :key="add.playerId"
              class="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0 border-border/40"
            >
              <div class="min-w-0">
                <div class="font-bold text-foreground truncate">
                  {{ add.name }}
                  <span class="text-muted-foreground font-normal">({{ add.position }})</span>
                </div>
                <div class="text-[11px] text-muted-foreground">
                  Added W{{ add.weekAdded }} · {{ add.verdictTag }}
                </div>
              </div>
              <span class="font-black text-emerald-500 shrink-0 ml-2">
                +{{ add.pointsContributed }} pts
              </span>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground py-2">
            No started waiver additions logged yet for {{ model.teamName }}.
          </p>
        </div>

        <!-- Questionable Additions -->
        <div class="rounded-xl border p-4 space-y-2.5">
          <div class="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <Flame class="w-3.5 h-3.5" />
            Questionable Moves & Bench Ornaments
          </div>
          <div v-if="model.rosterActivity.questionableAdditions.length > 0" class="space-y-2">
            <div
              v-for="add in model.rosterActivity.questionableAdditions"
              :key="add.playerId"
              class="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0 border-border/40"
            >
              <div class="min-w-0">
                <div class="font-bold text-foreground truncate">
                  {{ add.name }}
                  <span class="text-muted-foreground font-normal">({{ add.position }})</span>
                </div>
                <div class="text-[11px] text-muted-foreground">
                  Added W{{ add.weekAdded }}
                </div>
              </div>
              <Badge variant="outline" class="text-[10px] text-amber-500 border-amber-500/30 shrink-0 ml-2">
                {{ add.verdictTag }}
              </Badge>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground py-2">
            Zero wasted FAAB bombs on the ledger—surprisingly disciplined!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
