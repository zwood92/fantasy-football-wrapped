<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ArrowLeftRight,
  Check,
  Copy,
  DollarSign,
  Info,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TableDataType } from "@/types/types";
import {
  calculateTradeBalanceSuggestions,
  evaluateTrade,
  generateTradeVerdict,
  getAssetValue,
  getDraftPickValue,
  getFaabValue,
  type BalanceSuggestion,
  type TradeAsset,
  type TradeDraftPickAsset,
  type TradeFaabAsset,
  type TradeFairnessAssessment,
  type TradePlayerAsset,
  type TradeVerdictReport,
  type ValuationContext,
} from "@/lib/tradeCalculatorEngine";
import type { DynastyPerspective, TradeValuationMode } from "@/lib/tradeFinder";
import type { DynastyDraftPickAsset, TradeBuilderRoster } from "@/lib/leagueTradeValues";
import { isSuperflexLeague } from "@/lib/lineup";
import { useStore } from "@/store/store";
import PlayerAvatar from "@/components/shared/PlayerAvatar.vue";

interface Props {
  rosters?: TradeBuilderRoster[];
  tableData?: TableDataType[];
  dynastyPickAssets?: DynastyDraftPickAsset[];
  valuationMode?: TradeValuationMode;
  initialTeamAId?: number | null;
  initialTeamBId?: number | null;
  initialTeamASends?: string[];
  initialTeamBSends?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  rosters: () => [],
  tableData: () => [],
  dynastyPickAssets: () => [],
  valuationMode: "ros projection",
  initialTeamAId: null,
  initialTeamBId: null,
  initialTeamASends: () => [],
  initialTeamBSends: () => [],
});

const emit = defineEmits<{
  (e: "openBuilder", payload: { teamAId: number; teamBId: number; teamASends: string[]; teamBSends: string[] }): void;
}>();

const store = useStore();
const activeLeague = computed(() => store.currentLeague);

// Team selections
const selectedTeamAId = ref<number | null>(props.initialTeamAId);
const selectedTeamBId = ref<number | null>(props.initialTeamBId);

// Trade asset packages
const teamAAssets = ref<TradeAsset[]>([]);
const teamBAssets = ref<TradeAsset[]>([]);

// Valuation preferences
const dynastyPerspective = ref<DynastyPerspective>("balanced");
const isDynasty = computed(
  () =>
    props.valuationMode === "dynasty" ||
    activeLeague.value?.seasonType?.toLowerCase() === "dynasty"
);
const isSuperflex = computed(() =>
  isSuperflexLeague(activeLeague.value?.rosterPositions ?? [])
);
const currentSeason = computed(
  () => Number(activeLeague.value?.season) || new Date().getFullYear()
);

// Search & Filtering within Roster pickers
const searchTeamA = ref("");
const searchTeamB = ref("");
const posFilterTeamA = ref("ALL");
const posFilterTeamB = ref("ALL");

// Asset Dialog states
const faabDialogSide = ref<"A" | "B" | null>(null);
const pendingFaabAmount = ref(10);
const pickDialogSide = ref<"A" | "B" | null>(null);
const pendingPickSeason = ref(currentSeason.value);
const pendingPickRound = ref(1);
const pendingDynastyPickId = ref("");

// Custom Player Dialog
const customPlayerSide = ref<"A" | "B" | null>(null);
const customPlayerName = ref("");
const customPlayerPos = ref("WR");
const customPlayerValue = ref(40);
const customPlayerPoints = ref(180);

// AI Verdict State
const showVerdictDialog = ref(false);
const verdictReport = ref<TradeVerdictReport | null>(null);

// Roster lookups
const teamARoster = computed(() =>
  props.rosters.find((r) => r.id === selectedTeamAId.value)
);
const teamBRoster = computed(() =>
  props.rosters.find((r) => r.id === selectedTeamBId.value)
);

const teamAName = computed(
  () => teamARoster.value?.managerName || "Team A"
);
const teamBName = computed(
  () => teamBRoster.value?.managerName || "Team B"
);

// Available draft seasons & rounds
const draftSeasons = computed(() => {
  if (isDynasty.value && props.dynastyPickAssets.length > 0) {
    return [...new Set(props.dynastyPickAssets.map((p) => p.season))].sort(
      (a, b) => a - b
    );
  }
  const base = currentSeason.value;
  return [base, base + 1, base + 2, base + 3];
});

const draftRounds = [1, 2, 3, 4, 5];

const availableDynastyPicksA = computed(() =>
  props.dynastyPickAssets.filter(
    (pick) =>
      pick.ownerRosterId === selectedTeamAId.value &&
      !teamAAssets.value.some((a) => a.id === pick.id)
  )
);

const availableDynastyPicksB = computed(() =>
  props.dynastyPickAssets.filter(
    (pick) =>
      pick.ownerRosterId === selectedTeamBId.value &&
      !teamBAssets.value.some((a) => a.id === pick.id)
  )
);

// Valuation Context
const valuationContext = computed<ValuationContext>(() => ({
  seasonType: isDynasty.value ? "dynasty" : "redraft",
  valuationMode: props.valuationMode,
  isSuperflex: isSuperflex.value,
  scoringType: activeLeague.value?.scoringType ?? 1,
  currentSeason: currentSeason.value,
  dynastyPerspective: dynastyPerspective.value,
  remainingWeeks: 14,
}));

// Evaluation Calculation
const evaluation = computed<TradeFairnessAssessment>(() =>
  evaluateTrade(teamAAssets.value, teamBAssets.value, valuationContext.value)
);

// Auto-balancer suggestions
const balancerSuggestion = computed<BalanceSuggestion | null>(() => {
  const availableA = (teamARoster.value?.players ?? []).map(
    (p): TradePlayerAsset => ({
      type: "player",
      id: p.playerId || p.player_id,
      name: p.name || `${p.team} Defense`,
      position: p.position,
      team: p.team,
      tradeValue: p.tradeValue,
      positionRank: p.positionRank,
      overallRank: p.overallRank,
      dynastyAdp: p.dynastyAdp,
    })
  );
  const availableB = (teamBRoster.value?.players ?? []).map(
    (p): TradePlayerAsset => ({
      type: "player",
      id: p.playerId || p.player_id,
      name: p.name || `${p.team} Defense`,
      position: p.position,
      team: p.team,
      tradeValue: p.tradeValue,
      positionRank: p.positionRank,
      overallRank: p.overallRank,
      dynastyAdp: p.dynastyAdp,
    })
  );

  return calculateTradeBalanceSuggestions(
    teamAAssets.value,
    teamBAssets.value,
    valuationContext.value,
    availableA,
    availableB
  );
});

// Sync default team selections
watch(
  () => props.rosters,
  (rosters) => {
    if (rosters.length >= 2) {
      if (!selectedTeamAId.value || !rosters.some((r) => r.id === selectedTeamAId.value)) {
        selectedTeamAId.value = rosters[0].id;
      }
      if (!selectedTeamBId.value || !rosters.some((r) => r.id === selectedTeamBId.value)) {
        selectedTeamBId.value =
          rosters.find((r) => r.id !== selectedTeamAId.value)?.id ?? rosters[1].id;
      }
    }
  },
  { immediate: true }
);

// Apply initial players if passed
watch(
  () => [props.initialTeamASends, props.initialTeamBSends, props.rosters],
  () => {
    if (props.initialTeamASends.length > 0 && teamARoster.value) {
      props.initialTeamASends.forEach((id) => {
        const player = teamARoster.value?.players.find(
          (p) => p.playerId === id || p.player_id === id
        );
        if (player && !teamAAssets.value.some((a) => a.id === player.playerId)) {
          addPlayerToSide("A", player);
        }
      });
    }
    if (props.initialTeamBSends.length > 0 && teamBRoster.value) {
      props.initialTeamBSends.forEach((id) => {
        const player = teamBRoster.value?.players.find(
          (p) => p.playerId === id || p.player_id === id
        );
        if (player && !teamBAssets.value.some((a) => a.id === player.playerId)) {
          addPlayerToSide("B", player);
        }
      });
    }
  },
  { immediate: true }
);

// Asset Management Methods
const addPlayerToSide = (
  side: "A" | "B",
  player: {
    playerId?: string;
    player_id?: string;
    name?: string;
    position?: string;
    team?: string;
    tradeValue?: number;
    projectedPoints?: number;
    replacementPoints?: number;
    vorp?: number;
    positionRank?: number;
    overallRank?: number;
    dynastyAdp?: number | null;
  }
) => {
  const target = side === "A" ? teamAAssets : teamBAssets;
  const id = player.playerId || player.player_id || `custom-${Date.now()}`;
  if (target.value.some((a) => a.id === id)) return;

  const playerAsset: TradePlayerAsset = {
    type: "player",
    id,
    name: player.name || `${player.team} Defense`,
    position: (player.position || "WR").toUpperCase(),
    team: player.team,
    tradeValue: player.tradeValue,
    projectedPoints: player.projectedPoints,
    replacementPoints: player.replacementPoints,
    vorp: player.vorp,
    positionRank: player.positionRank,
    overallRank: player.overallRank,
    dynastyAdp: player.dynastyAdp,
  };

  target.value.push(playerAsset);
};

const removeAsset = (side: "A" | "B", assetId: string) => {
  if (side === "A") {
    teamAAssets.value = teamAAssets.value.filter((a) => a.id !== assetId);
  } else {
    teamBAssets.value = teamBAssets.value.filter((a) => a.id !== assetId);
  }
};

const swapTeams = () => {
  const tempId = selectedTeamAId.value;
  selectedTeamAId.value = selectedTeamBId.value;
  selectedTeamBId.value = tempId;

  const tempAssets = [...teamAAssets.value];
  teamAAssets.value = [...teamBAssets.value];
  teamBAssets.value = tempAssets;
};

const clearTrade = () => {
  teamAAssets.value = [];
  teamBAssets.value = [];
};

// Add FAAB
const submitAddFaab = (side: "A" | "B") => {
  const amount = Math.max(1, Number(pendingFaabAmount.value || 0));
  const target = side === "A" ? teamAAssets : teamBAssets;
  const existingIndex = target.value.findIndex((a) => a.type === "faab");

  const faabAsset: TradeFaabAsset = {
    type: "faab",
    id: `faab-${side}-${Date.now()}`,
    amount,
    value: getFaabValue(amount, 14, 100),
  };

  if (existingIndex >= 0) {
    target.value.splice(existingIndex, 1, faabAsset);
  } else {
    target.value.push(faabAsset);
  }
  faabDialogSide.value = null;
};

// Add Draft Pick
const submitAddPick = (side: "A" | "B") => {
  const target = side === "A" ? teamAAssets : teamBAssets;

  if (isDynasty.value && pendingDynastyPickId.value) {
    const availablePicks =
      side === "A" ? availableDynastyPicksA.value : availableDynastyPicksB.value;
    const pick = availablePicks.find((p) => p.id === pendingDynastyPickId.value);
    if (pick) {
      target.value.push({
        type: "draft_pick",
        id: pick.id,
        season: pick.season,
        round: pick.round,
        label: pick.label,
        originalRosterId: pick.originalRosterId,
        ownerRosterId: pick.ownerRosterId,
        value: getDraftPickValue(pick, currentSeason.value, dynastyPerspective.value),
      });
      pendingDynastyPickId.value = "";
      pickDialogSide.value = null;
      return;
    }
  }

  const season = Number(pendingPickSeason.value);
  const round = Number(pendingPickRound.value);
  const newPick: TradeDraftPickAsset = {
    type: "draft_pick",
    id: `pick-${side}-${season}-${round}-${Date.now()}`,
    season,
    round,
    label: `${season} Round ${round}`,
    value: getDraftPickValue({ season, round }, currentSeason.value, dynastyPerspective.value),
  };

  target.value.push(newPick);
  pickDialogSide.value = null;
};

// Add Custom Player
const submitAddCustomPlayer = (side: "A" | "B") => {
  if (!customPlayerName.value.trim()) return;

  const target = side === "A" ? teamAAssets : teamBAssets;
  target.value.push({
    type: "player",
    id: `custom-player-${Date.now()}`,
    name: customPlayerName.value.trim(),
    position: customPlayerPos.value,
    tradeValue: Number(customPlayerValue.value),
    projectedPoints: Number(customPlayerPoints.value),
  });

  customPlayerName.value = "";
  customPlayerSide.value = null;
};

// Apply Auto-Balancer Suggestion
const applyBalancerSuggestion = (
  suggestion: NonNullable<BalanceSuggestion>["suggestions"][number]
) => {
  const trailingSide = balancerSuggestion.value?.sideNeedingValue || "team_b";
  const target = trailingSide === "team_a" ? teamAAssets : teamBAssets;

  if (suggestion.type === "faab" && suggestion.faabAmount) {
    target.value.push({
      type: "faab",
      id: `faab-auto-${Date.now()}`,
      amount: suggestion.faabAmount,
      value: suggestion.value,
    });
    toast.success(`Added $${suggestion.faabAmount} FAAB to balance trade`);
  } else if (suggestion.type === "draft_pick" && suggestion.pickSeason && suggestion.pickRound) {
    target.value.push({
      type: "draft_pick",
      id: `pick-auto-${Date.now()}`,
      season: suggestion.pickSeason,
      round: suggestion.pickRound,
      label: `${suggestion.pickSeason} Round ${suggestion.pickRound}`,
      value: suggestion.value,
    });
    toast.success(`Added ${suggestion.pickSeason} Round ${suggestion.pickRound} pick`);
  } else if (suggestion.type === "player" && suggestion.playerId) {
    const availableRoster =
      trailingSide === "team_a"
        ? teamARoster.value?.players
        : teamBRoster.value?.players;
    const player = availableRoster?.find(
      (p) => p.playerId === suggestion.playerId || p.player_id === suggestion.playerId
    );
    if (player) {
      addPlayerToSide(trailingSide === "team_a" ? "A" : "B", player);
      toast.success(`Added ${player.name} to balance trade`);
    }
  }
};

// Open AI Verdict
const openAiVerdict = () => {
  verdictReport.value = generateTradeVerdict(
    teamAName.value,
    teamBName.value,
    teamAAssets.value,
    teamBAssets.value,
    valuationContext.value
  );
  showVerdictDialog.value = true;
};

// Copy Trade Summary
const copyTradeSummary = async () => {
  const text = [
    `🏈 Trade Valuation Breakdown (${isDynasty.value ? "Dynasty" : "Redraft"})`,
    `⚖️ Fairness: ${evaluation.value.fairnessScore}% (${evaluation.value.fairnessLabel})`,
    `🏆 Favored: ${evaluation.value.favoredSide === "even" ? "Even Deal" : evaluation.value.favoredSide === "team_a" ? teamAName.value : teamBName.value}`,
    "",
    `📦 ${teamAName.value} sends (${evaluation.value.teamAEffectiveValue} value pts):`,
    ...teamAAssets.value.map(
      (a) =>
        `  • ${a.type === "player" ? `${a.name} (${a.position}) - ${getAssetValue(a, valuationContext.value)} pts` : a.type === "draft_pick" ? `${a.label || `${a.season} R${a.round}`} - ${getAssetValue(a, valuationContext.value)} pts` : `$${a.amount} FAAB - ${getAssetValue(a, valuationContext.value)} pts`}`
    ),
    "",
    `📦 ${teamBName.value} sends (${evaluation.value.teamBEffectiveValue} value pts):`,
    ...teamBAssets.value.map(
      (a) =>
        `  • ${a.type === "player" ? `${a.name} (${a.position}) - ${getAssetValue(a, valuationContext.value)} pts` : a.type === "draft_pick" ? `${a.label || `${a.season} R${a.round}`} - ${getAssetValue(a, valuationContext.value)} pts` : `$${a.amount} FAAB - ${getAssetValue(a, valuationContext.value)} pts`}`
    ),
    "",
    `📊 Net Impact:`,
    `  • ${teamAName.value}: ${evaluation.value.teamANetGain >= 0 ? `+${evaluation.value.teamANetGain}` : evaluation.value.teamANetGain} value pts (${evaluation.value.teamAPointsNetGain >= 0 ? `+${evaluation.value.teamAPointsNetGain}` : evaluation.value.teamAPointsNetGain} pts/wk)`,
    `  • ${teamBName.value}: ${evaluation.value.teamBNetGain >= 0 ? `+${evaluation.value.teamBNetGain}` : evaluation.value.teamBNetGain} value pts (${evaluation.value.teamBPointsNetGain >= 0 ? `+${evaluation.value.teamBPointsNetGain}` : evaluation.value.teamBPointsNetGain} pts/wk)`,
    "",
    `💡 Verdict: ${evaluation.value.summary}`,
    "",
    "Generated with Fantasy Football Wrapped (https://ffwrapped.com)",
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    toast.success("Trade summary copied to clipboard!");
  } catch {
    toast.error("Could not copy to clipboard");
  }
};

// Filtered players for team drawers
const filteredRosterA = computed(() => {
  const search = searchTeamA.value.toLowerCase().trim();
  return (teamARoster.value?.players || []).filter((p) => {
    const matchesSearch =
      !search ||
      (p.name && p.name.toLowerCase().includes(search)) ||
      (p.team && p.team.toLowerCase().includes(search));
    const matchesPos =
      posFilterTeamA.value === "ALL" || p.position === posFilterTeamA.value;
    const notSelected = !teamAAssets.value.some(
      (a) => a.id === p.playerId || a.id === p.player_id
    );
    return matchesSearch && matchesPos && notSelected;
  });
});

const filteredRosterB = computed(() => {
  const search = searchTeamB.value.toLowerCase().trim();
  return (teamBRoster.value?.players || []).filter((p) => {
    const matchesSearch =
      !search ||
      (p.name && p.name.toLowerCase().includes(search)) ||
      (p.team && p.team.toLowerCase().includes(search));
    const matchesPos =
      posFilterTeamB.value === "ALL" || p.position === posFilterTeamB.value;
    const notSelected = !teamBAssets.value.some(
      (a) => a.id === p.playerId || a.id === p.player_id
    );
    return matchesSearch && matchesPos && notSelected;
  });
});

// Visual helpers
const fairnessColorClass = computed(() => {
  if (evaluation.value.fairnessLabel === "Very fair") {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  if (evaluation.value.fairnessLabel === "Fair") {
    return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
  }
  if (evaluation.value.fairnessLabel === "Slightly uneven") {
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  }
  return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
});

const formatNum = (n: number, d = 1) =>
  Number.isFinite(n) ? n.toFixed(d) : "0";
</script>

<template>
  <div class="space-y-4">
    <!-- Header Control Bar -->
    <div
      class="flex flex-col gap-3 p-4 border rounded-xl bg-card border-border/80 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div class="flex items-center gap-2">
          <Scale class="size-5 text-primary" />
          <h3 class="text-lg font-bold tracking-tight">Trade Calculator</h3>
          <Badge v-if="isDynasty" variant="secondary" class="font-semibold">
            Dynasty
          </Badge>
          <Badge v-else variant="outline"> Redraft </Badge>
          <Badge v-if="isSuperflex" variant="secondary" class="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
            Superflex
          </Badge>
        </div>
        <p class="mt-0.5 text-xs text-muted-foreground">
          Algorithmic multi-asset valuations with positional scarcity, dynasty age curves, and stud consolidation.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div v-if="isDynasty" class="flex items-center gap-1.5">
          <span class="text-xs font-medium text-muted-foreground">Perspective:</span>
          <Select v-model="dynastyPerspective">
            <SelectTrigger class="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="contender">Contender</SelectItem>
              <SelectItem value="rebuilder">Rebuilder</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5"
          @click="swapTeams"
          aria-label="Swap trade sides"
        >
          <ArrowLeftRight class="size-3.5" />
          Swap Sides
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="h-8 text-muted-foreground hover:text-foreground"
          @click="clearTrade"
          aria-label="Clear all trade assets"
        >
          <RefreshCw class="size-3.5 mr-1" />
          Reset
        </Button>
      </div>
    </div>

    <!-- Trade Fairness & Analytics Overview Bar -->
    <Card class="overflow-hidden border border-border shadow-xs">
      <div class="p-4 sm:p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <!-- Fairness Meter Gauge -->
          <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold tracking-wide uppercase text-muted-foreground">
                Fairness Index
              </span>
              <div class="flex items-center gap-2">
                <span
                  class="px-2.5 py-0.5 text-xs font-bold rounded-full border"
                  :class="fairnessColorClass"
                >
                  {{ evaluation.fairnessLabel }}
                </span>
                <span class="text-sm font-extrabold tabular-nums">
                  {{ formatNum(evaluation.fairnessScore) }}%
                </span>
              </div>
            </div>

            <!-- Visual Meter Bar -->
            <div class="w-full h-3 overflow-hidden rounded-full bg-muted/60">
              <div
                class="h-full transition-all duration-500 rounded-full"
                :class="[
                  evaluation.fairnessScore >= 90
                    ? 'bg-emerald-500'
                    : evaluation.fairnessScore >= 80
                      ? 'bg-sky-500'
                      : evaluation.fairnessScore >= 65
                        ? 'bg-amber-500'
                        : 'bg-rose-500',
                ]"
                :style="{ width: `${evaluation.fairnessScore}%` }"
              />
            </div>

            <p class="text-xs text-muted-foreground">
              {{ evaluation.summary }}
            </p>
          </div>

          <!-- Favored Side & Point Delta Summary -->
          <div class="flex flex-wrap items-center gap-3 pt-3 border-t lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0 border-border/80">
            <div class="text-center sm:text-left">
              <span class="block text-[11px] font-semibold text-muted-foreground uppercase">
                Favored Side
              </span>
              <span class="text-sm font-bold">
                {{
                  evaluation.favoredSide === "even"
                    ? "⚖️ Even Trade"
                    : evaluation.favoredSide === "team_a"
                      ? `🏆 ${teamAName}`
                      : `🏆 ${teamBName}`
                }}
              </span>
            </div>

            <div class="text-center sm:text-left">
              <span class="block text-[11px] font-semibold text-muted-foreground uppercase">
                Value Margin
              </span>
              <span class="text-sm font-bold tabular-nums">
                {{ evaluation.valueGap > 0 ? `${formatNum(evaluation.valueGap)} pts (${formatNum(evaluation.valueGapPercent)}%)` : "0.0 pts" }}
              </span>
            </div>

            <Button
              variant="default"
              size="sm"
              class="h-9 gap-1.5 font-semibold bg-gradient-to-r from-primary to-primary/85 shadow-xs"
              @click="openAiVerdict"
            >
              <Sparkles class="size-4 text-amber-300" />
              AI Trade Verdict
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <!-- Side-by-Side Trade Builder Grid -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <!-- Team A Package Card -->
      <Card class="flex flex-col border border-border">
        <CardHeader class="pb-3 border-b bg-muted/20 border-border/70">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="space-y-1">
              <Label class="text-xs font-semibold uppercase text-muted-foreground">
                Team A (Sends)
              </Label>
              <Select
                :model-value="selectedTeamAId ? String(selectedTeamAId) : ''"
                @update:model-value="selectedTeamAId = Number($event)"
              >
                <SelectTrigger class="w-48 h-8 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="r in rosters"
                    :key="`roster-a-${r.id}`"
                    :value="String(r.id)"
                    :disabled="r.id === selectedTeamBId"
                  >
                    {{ r.managerName }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="text-right">
              <span class="block text-[11px] font-semibold uppercase text-muted-foreground">
                Package Value
              </span>
              <span class="text-base font-extrabold text-primary tabular-nums">
                {{ formatNum(evaluation.teamAEffectiveValue) }} pts
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent class="flex-1 p-4 space-y-4">
          <!-- Asset Action Buttons -->
          <div class="flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              class="gap-1 font-medium"
              @click="pickDialogSide = 'A'"
            >
              <Plus class="size-3.5" /> Draft Pick
            </Button>
            <Button
              variant="secondary"
              size="xs"
              class="gap-1 font-medium"
              @click="faabDialogSide = 'A'"
            >
              <DollarSign class="size-3.5" /> FAAB
            </Button>
            <Button
              variant="outline"
              size="xs"
              class="gap-1 font-medium"
              @click="customPlayerSide = 'A'"
            >
              <Plus class="size-3.5" /> Custom Player
            </Button>
          </div>

          <!-- Selected Asset Items List -->
          <div class="space-y-2 min-h-24">
            <div
              v-if="teamAAssets.length === 0"
              class="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg border-border/80 bg-muted/10"
            >
              <p class="text-xs font-medium text-muted-foreground">
                No assets added for {{ teamAName }}
              </p>
              <p class="text-[11px] text-muted-foreground/80 mt-0.5">
                Select players from the roster below or add draft picks/FAAB.
              </p>
            </div>

            <div
              v-for="asset in teamAAssets"
              :key="`asset-a-${asset.id}`"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card shadow-2xs hover:border-primary/50 transition-colors"
            >
              <!-- Player Asset -->
              <div v-if="asset.type === 'player'" class="flex items-center min-w-0 gap-2.5">
                <PlayerAvatar
                  :player-id="asset.id"
                  :name="asset.name"
                  :team="asset.team"
                  :position="asset.position"
                  size="md"
                />
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate">
                    {{ asset.name }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ asset.position }} · {{ asset.team || 'FA' }}
                    <span v-if="asset.projectedPoints" class="ml-1 text-[11px]">
                      ({{ formatNum(asset.projectedPoints) }} proj pts)
                    </span>
                  </p>
                </div>
              </div>

              <!-- Draft Pick Asset -->
              <div v-else-if="asset.type === 'draft_pick'" class="flex items-center gap-2">
                <div class="flex items-center justify-center rounded-md size-9 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Scale class="size-4" />
                </div>
                <div>
                  <p class="text-sm font-semibold">
                    {{ asset.label || `${asset.season} Round ${asset.round}` }}
                  </p>
                  <p class="text-xs text-muted-foreground">Draft Capital</p>
                </div>
              </div>

              <!-- FAAB Asset -->
              <div v-else-if="asset.type === 'faab'" class="flex items-center gap-2">
                <div class="flex items-center justify-center rounded-md size-9 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign class="size-4" />
                </div>
                <div>
                  <p class="text-sm font-semibold">${{ asset.amount }} FAAB</p>
                  <p class="text-xs text-muted-foreground">Waiver Budget</p>
                </div>
              </div>

              <!-- Value Badge & Remove -->
              <div class="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" class="font-bold tabular-nums">
                  {{ formatNum(getAssetValue(asset, valuationContext)) }} pts
                </Badge>
                <button
                  type="button"
                  class="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  :aria-label="`Remove asset`"
                  @click="removeAsset('A', asset.id)"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>
          </div>

          <Separator class="my-2" />

          <!-- Team A Roster Player Picker Drawer -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold tracking-wide uppercase text-muted-foreground">
                {{ teamAName }} Roster
              </span>
              <span class="text-xs text-muted-foreground">
                Click player to add
              </span>
            </div>

            <!-- Search & Position Filter -->
            <div class="flex gap-2 mb-2">
              <Input
                v-model="searchTeamA"
                placeholder="Search roster..."
                class="h-8 text-xs"
              />
              <Select v-model="posFilterTeamA">
                <SelectTrigger class="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="QB">QB</SelectItem>
                  <SelectItem value="RB">RB</SelectItem>
                  <SelectItem value="WR">WR</SelectItem>
                  <SelectItem value="TE">TE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Quick Player List -->
            <div class="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              <button
                v-for="player in filteredRosterA"
                :key="`roster-pick-a-${player.playerId || player.player_id}`"
                type="button"
                class="flex items-center justify-between p-2 text-left rounded-md border border-border/60 bg-muted/20 hover:bg-accent hover:border-primary/40 transition-colors"
                @click="addPlayerToSide('A', player)"
              >
                <div class="flex items-center min-w-0 gap-2">
                  <PlayerAvatar
                    :player-id="player.playerId || player.player_id"
                    :name="player.name"
                    :team="player.team"
                    :position="player.position"
                    size="xs"
                  />
                  <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-muted text-muted-foreground">
                    {{ player.position }}
                  </span>
                  <span class="text-xs font-semibold truncate">
                    {{ player.name }}
                  </span>
                  <span class="text-[11px] text-muted-foreground truncate">
                    {{ player.team }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-xs font-bold tabular-nums text-primary">
                    {{ formatNum(getAssetValue({ type: 'player', id: player.playerId, name: player.name, position: player.position, tradeValue: player.tradeValue, projectedPoints: player.projectedPoints }, valuationContext)) }}
                  </span>
                  <Plus class="size-3.5 text-muted-foreground" />
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Team B Package Card -->
      <Card class="flex flex-col border border-border">
        <CardHeader class="pb-3 border-b bg-muted/20 border-border/70">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="space-y-1">
              <Label class="text-xs font-semibold uppercase text-muted-foreground">
                Team B (Sends)
              </Label>
              <Select
                :model-value="selectedTeamBId ? String(selectedTeamBId) : ''"
                @update:model-value="selectedTeamBId = Number($event)"
              >
                <SelectTrigger class="w-48 h-8 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="r in rosters"
                    :key="`roster-b-${r.id}`"
                    :value="String(r.id)"
                    :disabled="r.id === selectedTeamAId"
                  >
                    {{ r.managerName }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="text-right">
              <span class="block text-[11px] font-semibold uppercase text-muted-foreground">
                Package Value
              </span>
              <span class="text-base font-extrabold text-primary tabular-nums">
                {{ formatNum(evaluation.teamBEffectiveValue) }} pts
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent class="flex-1 p-4 space-y-4">
          <!-- Asset Action Buttons -->
          <div class="flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              class="gap-1 font-medium"
              @click="pickDialogSide = 'B'"
            >
              <Plus class="size-3.5" /> Draft Pick
            </Button>
            <Button
              variant="secondary"
              size="xs"
              class="gap-1 font-medium"
              @click="faabDialogSide = 'B'"
            >
              <DollarSign class="size-3.5" /> FAAB
            </Button>
            <Button
              variant="outline"
              size="xs"
              class="gap-1 font-medium"
              @click="customPlayerSide = 'B'"
            >
              <Plus class="size-3.5" /> Custom Player
            </Button>
          </div>

          <!-- Selected Asset Items List -->
          <div class="space-y-2 min-h-24">
            <div
              v-if="teamBAssets.length === 0"
              class="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg border-border/80 bg-muted/10"
            >
              <p class="text-xs font-medium text-muted-foreground">
                No assets added for {{ teamBName }}
              </p>
              <p class="text-[11px] text-muted-foreground/80 mt-0.5">
                Select players from the roster below or add draft picks/FAAB.
              </p>
            </div>

            <div
              v-for="asset in teamBAssets"
              :key="`asset-b-${asset.id}`"
              class="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card shadow-2xs hover:border-primary/50 transition-colors"
            >
              <!-- Player Asset -->
              <div v-if="asset.type === 'player'" class="flex items-center min-w-0 gap-2.5">
                <PlayerAvatar
                  :player-id="asset.id"
                  :name="asset.name"
                  :team="asset.team"
                  :position="asset.position"
                  size="md"
                />
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate">
                    {{ asset.name }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ asset.position }} · {{ asset.team || 'FA' }}
                    <span v-if="asset.projectedPoints" class="ml-1 text-[11px]">
                      ({{ formatNum(asset.projectedPoints) }} proj pts)
                    </span>
                  </p>
                </div>
              </div>

              <!-- Draft Pick Asset -->
              <div v-else-if="asset.type === 'draft_pick'" class="flex items-center gap-2">
                <div class="flex items-center justify-center rounded-md size-9 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Scale class="size-4" />
                </div>
                <div>
                  <p class="text-sm font-semibold">
                    {{ asset.label || `${asset.season} Round ${asset.round}` }}
                  </p>
                  <p class="text-xs text-muted-foreground">Draft Capital</p>
                </div>
              </div>

              <!-- FAAB Asset -->
              <div v-else-if="asset.type === 'faab'" class="flex items-center gap-2">
                <div class="flex items-center justify-center rounded-md size-9 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign class="size-4" />
                </div>
                <div>
                  <p class="text-sm font-semibold">${{ asset.amount }} FAAB</p>
                  <p class="text-xs text-muted-foreground">Waiver Budget</p>
                </div>
              </div>

              <!-- Value Badge & Remove -->
              <div class="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" class="font-bold tabular-nums">
                  {{ formatNum(getAssetValue(asset, valuationContext)) }} pts
                </Badge>
                <button
                  type="button"
                  class="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  :aria-label="`Remove asset`"
                  @click="removeAsset('B', asset.id)"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>
          </div>

          <Separator class="my-2" />

          <!-- Team B Roster Player Picker Drawer -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold tracking-wide uppercase text-muted-foreground">
                {{ teamBName }} Roster
              </span>
              <span class="text-xs text-muted-foreground">
                Click player to add
              </span>
            </div>

            <!-- Search & Position Filter -->
            <div class="flex gap-2 mb-2">
              <Input
                v-model="searchTeamB"
                placeholder="Search roster..."
                class="h-8 text-xs"
              />
              <Select v-model="posFilterTeamB">
                <SelectTrigger class="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="QB">QB</SelectItem>
                  <SelectItem value="RB">RB</SelectItem>
                  <SelectItem value="WR">WR</SelectItem>
                  <SelectItem value="TE">TE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Quick Player List -->
            <div class="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              <button
                v-for="player in filteredRosterB"
                :key="`roster-pick-b-${player.playerId || player.player_id}`"
                type="button"
                class="flex items-center justify-between p-2 text-left rounded-md border border-border/60 bg-muted/20 hover:bg-accent hover:border-primary/40 transition-colors"
                @click="addPlayerToSide('B', player)"
              >
                <div class="flex items-center min-w-0 gap-2">
                  <PlayerAvatar
                    :player-id="player.playerId || player.player_id"
                    :name="player.name"
                    :team="player.team"
                    :position="player.position"
                    size="xs"
                  />
                  <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-muted text-muted-foreground">
                    {{ player.position }}
                  </span>
                  <span class="text-xs font-semibold truncate">
                    {{ player.name }}
                  </span>
                  <span class="text-[11px] text-muted-foreground truncate">
                    {{ player.team }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-xs font-bold tabular-nums text-primary">
                    {{ formatNum(getAssetValue({ type: 'player', id: player.playerId, name: player.name, position: player.position, tradeValue: player.tradeValue, projectedPoints: player.projectedPoints }, valuationContext)) }}
                  </span>
                  <Plus class="size-3.5 text-muted-foreground" />
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Positional Balance & Auto-Balancer Section -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Net Positional Impact Grid -->
      <Card class="lg:col-span-2 border border-border">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
            <span>Net Positional & Point Impact</span>
            <Button
              variant="outline"
              size="xs"
              class="h-7 gap-1"
              @click="copyTradeSummary"
            >
              <Copy class="size-3" /> Copy Summary
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent class="p-4 pt-1 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <!-- Team A Net Summary -->
            <div class="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
              <p class="text-xs font-bold text-foreground truncate">
                {{ teamAName }} Net Outlook
              </p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Market Capital:</span>
                <span
                  class="font-bold tabular-nums"
                  :class="evaluation.teamANetGain >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                >
                  {{ evaluation.teamANetGain >= 0 ? `+${formatNum(evaluation.teamANetGain)}` : formatNum(evaluation.teamANetGain) }} pts
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Weekly Projections:</span>
                <span
                  class="font-bold tabular-nums"
                  :class="evaluation.teamAPointsNetGain >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                >
                  {{ evaluation.teamAPointsNetGain >= 0 ? `+${formatNum(evaluation.teamAPointsNetGain)}` : formatNum(evaluation.teamAPointsNetGain) }} pts/wk
                </span>
              </div>
            </div>

            <!-- Team B Net Summary -->
            <div class="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
              <p class="text-xs font-bold text-foreground truncate">
                {{ teamBName }} Net Outlook
              </p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Market Capital:</span>
                <span
                  class="font-bold tabular-nums"
                  :class="evaluation.teamBNetGain >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                >
                  {{ evaluation.teamBNetGain >= 0 ? `+${formatNum(evaluation.teamBNetGain)}` : formatNum(evaluation.teamBNetGain) }} pts
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Weekly Projections:</span>
                <span
                  class="font-bold tabular-nums"
                  :class="evaluation.teamBPointsNetGain >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                >
                  {{ evaluation.teamBPointsNetGain >= 0 ? `+${formatNum(evaluation.teamBPointsNetGain)}` : formatNum(evaluation.teamBPointsNetGain) }} pts/wk
                </span>
              </div>
            </div>
          </div>

          <!-- Position Breakdown Chips -->
          <div class="pt-2">
            <span class="text-[11px] font-semibold text-muted-foreground block mb-1.5">
              Positional Exchanges
            </span>
            <div class="flex flex-wrap gap-1.5">
              <template v-for="(delta, pos) in evaluation.netPositionalImpact.teamA" :key="`pos-delta-${pos}`">
                <Badge
                  v-if="delta.incomingCount > 0 || delta.outgoingCount > 0"
                  variant="outline"
                  class="text-xs font-medium py-1 px-2.5 flex items-center gap-1.5"
                >
                  <span class="font-bold">{{ pos }}:</span>
                  <span
                    class="tabular-nums font-semibold"
                    :class="delta.netValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                  >
                    {{ teamAName }} {{ delta.netValue >= 0 ? `+${formatNum(delta.netValue)}` : formatNum(delta.netValue) }}
                  </span>
                </Badge>
              </template>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Auto-Balancer Suggestions Card -->
      <Card class="border border-border">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Zap class="size-4 text-amber-500" />
            Trade Auto-Balancer
          </CardTitle>
        </CardHeader>
        <CardContent class="p-4 pt-1 space-y-3">
          <div v-if="!balancerSuggestion">
            <div class="p-3 text-center rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <Check class="size-5 mx-auto text-emerald-500 mb-1" />
              <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Well Balanced Trade
              </p>
              <p class="text-[11px] text-muted-foreground mt-0.5">
                Valuations are within parity threshold. No compensation required.
              </p>
            </div>
          </div>

          <div v-else class="space-y-2">
            <p class="text-xs leading-relaxed text-muted-foreground">
              To balance the <span class="font-bold text-foreground">{{ formatNum(balancerSuggestion.deficit) }} pt</span> gap,
              <span class="font-semibold text-primary">
                {{ balancerSuggestion.sideNeedingValue === 'team_a' ? teamAName : teamBName }}
              </span>
              can add:
            </p>

            <div class="space-y-1.5">
              <div
                v-for="(sug, idx) in balancerSuggestion.suggestions"
                :key="`balancer-${idx}`"
                class="flex items-center justify-between p-2 rounded-md border border-border/70 bg-card hover:bg-muted/40 transition-colors"
              >
                <div>
                  <p class="text-xs font-semibold">{{ sug.description }}</p>
                  <p class="text-[10px] text-muted-foreground">
                    Value: ~{{ formatNum(sug.value) }} pts
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="secondary"
                  class="font-semibold h-7 text-xs"
                  @click="applyBalancerSuggestion(sug)"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- FAAB Modal Dialog -->
    <Dialog :open="faabDialogSide !== null" @update:open="faabDialogSide = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add FAAB Dollars</DialogTitle>
          <DialogDescription>
            Allocate waiver budget for {{ faabDialogSide === 'A' ? teamAName : teamBName }}.
          </DialogDescription>
        </DialogHeader>
        <div class="py-3 space-y-3">
          <Label for="faab-input">FAAB Amount ($)</Label>
          <div class="flex items-center gap-2">
            <Input
              id="faab-input"
              v-model="pendingFaabAmount"
              type="number"
              min="1"
              max="200"
              class="w-32"
            />
            <span class="text-xs text-muted-foreground">
              Estimated Value: ~{{ formatNum(getFaabValue(pendingFaabAmount, 14, 100)) }} pts
            </span>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="faabDialogSide = null">Cancel</Button>
          <Button @click="submitAddFaab(faabDialogSide!)">Add FAAB</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Draft Pick Modal Dialog -->
    <Dialog :open="pickDialogSide !== null" @update:open="pickDialogSide = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Draft Pick</DialogTitle>
          <DialogDescription>
            Select rookie / future draft pick for {{ pickDialogSide === 'A' ? teamAName : teamBName }}.
          </DialogDescription>
        </DialogHeader>
        <div class="py-3 space-y-3">
          <div v-if="isDynasty && (pickDialogSide === 'A' ? availableDynastyPicksA.length : availableDynastyPicksB.length)">
            <Label class="block mb-1 text-xs">Owned Draft Pick</Label>
            <Select v-model="pendingDynastyPickId">
              <SelectTrigger>
                <SelectValue placeholder="Choose owned pick..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="p in (pickDialogSide === 'A' ? availableDynastyPicksA : availableDynastyPicksB)"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.label }} (~{{ formatNum(getDraftPickValue(p, currentSeason, dynastyPerspective)) }} pts)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-else class="grid grid-cols-2 gap-3">
            <div>
              <Label class="block mb-1 text-xs">Season</Label>
              <Select v-model="pendingPickSeason">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="yr in draftSeasons"
                    :key="`yr-${yr}`"
                    :value="yr"
                  >
                    {{ yr }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label class="block mb-1 text-xs">Round</Label>
              <Select v-model="pendingPickRound">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="rnd in draftRounds"
                    :key="`rnd-${rnd}`"
                    :value="rnd"
                  >
                    Round {{ rnd }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="pickDialogSide = null">Cancel</Button>
          <Button @click="submitAddPick(pickDialogSide!)">Add Pick</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Custom Player Dialog -->
    <Dialog :open="customPlayerSide !== null" @update:open="customPlayerSide = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Player</DialogTitle>
          <DialogDescription>
            Insert any player into {{ customPlayerSide === 'A' ? teamAName : teamBName }}'s package.
          </DialogDescription>
        </DialogHeader>
        <div class="py-3 space-y-3">
          <div>
            <Label for="custom-player-name" class="text-xs">Player Name</Label>
            <Input
              id="custom-player-name"
              v-model="customPlayerName"
              placeholder="e.g. Caleb Williams"
              class="mt-1"
            />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <Label class="text-xs">Position</Label>
              <Select v-model="customPlayerPos">
                <SelectTrigger class="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QB">QB</SelectItem>
                  <SelectItem value="RB">RB</SelectItem>
                  <SelectItem value="WR">WR</SelectItem>
                  <SelectItem value="TE">TE</SelectItem>
                  <SelectItem value="DEF">DEF</SelectItem>
                  <SelectItem value="K">K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label for="custom-player-val" class="text-xs">Trade Value</Label>
              <Input
                id="custom-player-val"
                v-model="customPlayerValue"
                type="number"
                min="1"
                max="100"
                class="mt-1"
              />
            </div>
            <div>
              <Label for="custom-player-pts" class="text-xs">Proj Points</Label>
              <Input
                id="custom-player-pts"
                v-model="customPlayerPoints"
                type="number"
                min="0"
                class="mt-1"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="customPlayerSide = null">Cancel</Button>
          <Button @click="submitAddCustomPlayer(customPlayerSide!)">Add Custom Player</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- AI Verdict Dialog -->
    <Dialog v-model:open="showVerdictDialog">
      <DialogContent class="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div class="flex items-center gap-2">
            <Sparkles class="size-5 text-amber-400" />
            <DialogTitle class="text-lg font-bold">
              AI Trade Verdict
            </DialogTitle>
          </div>
          <DialogDescription>
            Deep neural analysis of roster structure, positional value, and trade equity.
          </DialogDescription>
        </DialogHeader>

        <div v-if="verdictReport" class="py-3 space-y-4">
          <!-- Verdict Headline Banner -->
          <div class="p-4 border rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <h4 class="text-base font-extrabold tracking-tight text-foreground">
              {{ verdictReport.headline }}
            </h4>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" class="font-bold">
                Winner: {{ verdictReport.winner }}
              </Badge>
              <Badge variant="secondary" class="font-bold">
                Match: {{ formatNum(verdictReport.fairnessScore) }}%
              </Badge>
            </div>
          </div>

          <!-- Team Grades Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 text-center border rounded-lg bg-card">
              <span class="text-xs font-semibold text-muted-foreground block">
                {{ verdictReport.teamAName }} Grade
              </span>
              <span class="text-2xl font-black text-primary">
                {{ verdictReport.teamAGrade }}
              </span>
            </div>
            <div class="p-3 text-center border rounded-lg bg-card">
              <span class="text-xs font-semibold text-muted-foreground block">
                {{ verdictReport.teamBName }} Grade
              </span>
              <span class="text-2xl font-black text-primary">
                {{ verdictReport.teamBGrade }}
              </span>
            </div>
          </div>

          <!-- Detailed Narrative -->
          <div class="p-4 border rounded-lg bg-muted/20 space-y-2">
            <h5 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Analytical Breakdown
            </h5>
            <p class="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {{ verdictReport.verdictText }}
            </p>
          </div>

          <!-- Team Breakdown Bullets -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="p-3 border rounded-lg bg-card space-y-1.5">
              <p class="font-bold text-foreground">{{ verdictReport.teamAName }} Takeaways</p>
              <ul class="space-y-1 text-muted-foreground list-disc list-inside">
                <li v-for="(item, i) in verdictReport.teamAAnalysis" :key="`ta-${i}`">
                  {{ item }}
                </li>
              </ul>
            </div>
            <div class="p-3 border rounded-lg bg-card space-y-1.5">
              <p class="font-bold text-foreground">{{ verdictReport.teamBName }} Takeaways</p>
              <ul class="space-y-1 text-muted-foreground list-disc list-inside">
                <li v-for="(item, i) in verdictReport.teamBAnalysis" :key="`tb-${i}`">
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Key Recommendation -->
          <div class="p-3 rounded-lg border border-border bg-card">
            <p class="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Zap class="size-3.5" /> Key Recommendation
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ verdictReport.keyTakeaway }}
            </p>
          </div>
        </div>

        <div class="flex justify-between items-center pt-2 border-t border-border">
          <Button variant="outline" size="sm" class="gap-1.5" @click="copyTradeSummary">
            <Copy class="size-3.5" /> Copy Verdict
          </Button>
          <Button size="sm" @click="showVerdictDialog = false">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
