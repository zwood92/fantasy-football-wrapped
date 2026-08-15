<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useStore } from "@/store/store";
import type { TableDataType } from "@/types/types";
import {
  fetchTrendingRadarPlayers,
  filterTrendingRadarList,
  formatTrendingCount,
  type TrendingActionType,
  type TrendingTimeWindow,
  type PlayerPositionFilter,
  type TrendingPlayerItem,
} from "@/lib/trendingRadar";
import Card from "@/components/ui/card/Card.vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Flame,
  Snowflake,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
  RefreshCw,
  ArrowRightLeft,
  UserCheck,
  UserPlus,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Info,
  Radio,
} from "@lucide/vue";
import { toast } from "vue-sonner";

const props = defineProps<{
  tableData?: TableDataType[];
}>();

const router = useRouter();
const route = useRoute();
const store = useStore();

const activeType = ref<TrendingActionType>("add");
const selectedTimeWindow = ref<TrendingTimeWindow>(24);
const selectedPosition = ref<PlayerPositionFilter>("ALL");
const availableOnly = ref(false);
const searchQuery = ref("");

const loading = ref(false);
const rawPlayers = ref<TrendingPlayerItem[]>([]);
const selectedPlayerForClaim = ref<TrendingPlayerItem | null>(null);
const claimDialogOpen = ref(false);
const copiedPlayerId = ref<string | null>(null);

const timeWindowOptions: { label: string; value: TrendingTimeWindow }[] = [
  { label: "Last 24 Hours", value: 24 },
  { label: "Last 48 Hours", value: 48 },
  { label: "Last 7 Days", value: 168 },
];

const positionOptions: PlayerPositionFilter[] = [
  "ALL",
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
];

const currentLeague = computed(() => store.currentLeague);
const isDemoLeague = computed(
  () => !store.currentLeagueId && store.leagueInfo.length === 0
);

const effectiveTableData = computed<TableDataType[]>(() => {
  if (props.tableData && props.tableData.length > 0) {
    return props.tableData;
  }
  return [];
});

const loadTrendingPlayers = async () => {
  loading.value = true;
  try {
    const data = await fetchTrendingRadarPlayers({
      type: activeType.value,
      lookbackHours: selectedTimeWindow.value,
      limit: 30,
      tableData: effectiveTableData.value,
      league: currentLeague.value,
      forceDemo: isDemoLeague.value,
    });
    rawPlayers.value = data;
  } catch (error) {
    console.error("Failed to load trending players feed:", error);
    toast.error("Failed to load trending feed. Using cached data.");
  } finally {
    loading.value = false;
  }
};

const filteredPlayers = computed(() => {
  return filterTrendingRadarList(rawPlayers.value, {
    position: selectedPosition.value,
    availableOnly: availableOnly.value,
    searchQuery: searchQuery.value,
  });
});

const statsSummary = computed(() => {
  const total = rawPlayers.value.length;
  const available = rawPlayers.value.filter((p) => p.isAvailable).length;
  const rostered = total - available;
  const availablePercent = total > 0 ? Math.round((available / total) * 100) : 0;
  return {
    total,
    available,
    rostered,
    availablePercent,
  };
});

const getPositionBadgeStyle = (pos: string) => {
  switch (pos?.toUpperCase()) {
    case "QB":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    case "RB":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "WR":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "TE":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "K":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    case "DEF":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const handleOpenTradeLab = (player: TrendingPlayerItem) => {
  router.push({
    query: {
      ...route.query,
      tradeMode: "builder",
      tradePlayerId: player.playerId,
      tradeRosterId: player.rosterId ? String(player.rosterId) : undefined,
    },
  });
  store.currentTab = "Trade Lab";
  toast.success(`Opened ${player.name} in Trade Lab Builder`);
};

const handleOpenClaimDialog = (player: TrendingPlayerItem) => {
  selectedPlayerForClaim.value = player;
  claimDialogOpen.value = true;
};

const copyPlayerName = (player: TrendingPlayerItem) => {
  if (!navigator?.clipboard) {
    toast.info(`Player: ${player.name}`);
    return;
  }
  navigator.clipboard.writeText(player.name);
  copiedPlayerId.value = player.playerId;
  toast.success(`"${player.name}" copied to clipboard!`);
  setTimeout(() => {
    if (copiedPlayerId.value === player.playerId) {
      copiedPlayerId.value = null;
    }
  }, 2500);
};

const resetFilters = () => {
  selectedPosition.value = "ALL";
  availableOnly.value = false;
  searchQuery.value = "";
};

watch([activeType, selectedTimeWindow], () => {
  loadTrendingPlayers();
});

watch(
  () => store.currentLeagueId,
  () => {
    loadTrendingPlayers();
  }
);

onMounted(() => {
  loadTrendingPlayers();
});
</script>

<template>
  <div class="space-y-4">
    <!-- Top Card: Header & Primary Controls -->
    <Card class="p-4 sm:p-6 bg-card border-border shadow-xs">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <!-- Title & Subtitle -->
        <div>
          <div class="flex items-center gap-2.5">
            <div
              class="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary"
            >
              <Radio class="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Trending Wire Radar
                </h2>
                <Badge
                  variant="outline"
                  class="gap-1 border-primary/40 bg-primary/10 text-primary text-[11px] font-medium"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Live Feed
                </Badge>
              </div>
              <p class="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Real-time Sleeper transaction trends cross-referenced with your league roster ownership.
              </p>
            </div>
          </div>
        </div>

        <!-- Adds / Drops Mode Switcher + Time Window Selector -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Type Segmented Switch -->
          <div class="inline-flex p-1 rounded-lg bg-muted/80 border border-border">
            <button
              type="button"
              @click="activeType = 'add'"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer',
                activeType === 'add'
                  ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
            >
              <Flame class="w-4 h-4 text-emerald-500" />
              <span>Trending Adds</span>
            </button>
            <button
              type="button"
              @click="activeType = 'drop'"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer',
                activeType === 'drop'
                  ? 'bg-background text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
            >
              <Snowflake class="w-4 h-4 text-rose-500" />
              <span>Trending Drops</span>
            </button>
          </div>

          <!-- Time Window Chips -->
          <div class="inline-flex p-1 rounded-lg bg-muted/80 border border-border">
            <button
              v-for="timeOption in timeWindowOptions"
              :key="timeOption.value"
              type="button"
              @click="selectedTimeWindow = timeOption.value"
              :class="[
                'px-2.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer',
                selectedTimeWindow === timeOption.value
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
            >
              {{ timeOption.value === 168 ? '7 Days' : `${timeOption.value}h` }}
            </button>
          </div>

          <!-- Refresh Button -->
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9 shrink-0"
            :disabled="loading"
            @click="loadTrendingPlayers"
            title="Refresh feed"
          >
            <RefreshCw
              class="w-4 h-4 text-muted-foreground"
              :class="{ 'animate-spin': loading }"
            />
          </Button>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div class="grid grid-cols-2 gap-2 pt-4 mt-4 border-t sm:grid-cols-4 border-border/60">
        <div class="p-2.5 rounded-lg bg-muted/40 border border-border/50">
          <p class="text-[11px] font-medium text-muted-foreground">Market Momentum</p>
          <p class="text-base sm:text-lg font-bold text-foreground mt-0.5">
            {{ activeType === 'add' ? '🔥 Heavy Buying' : '❄️ Heavy Selling' }}
          </p>
        </div>
        <div class="p-2.5 rounded-lg bg-muted/40 border border-border/50">
          <p class="text-[11px] font-medium text-muted-foreground">Time Horizon</p>
          <p class="text-base sm:text-lg font-bold text-foreground mt-0.5">
            Past {{ selectedTimeWindow === 168 ? '7 Days' : `${selectedTimeWindow} Hours` }}
          </p>
        </div>
        <div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Free Agents Available
          </p>
          <p class="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {{ statsSummary.available }} <span class="text-xs font-normal">({{ statsSummary.availablePercent }}%)</span>
          </p>
        </div>
        <div class="p-2.5 rounded-lg bg-muted/40 border border-border/50">
          <p class="text-[11px] font-medium text-muted-foreground">Rostered in League</p>
          <p class="text-base sm:text-lg font-bold text-foreground mt-0.5">
            {{ statsSummary.rostered }} <span class="text-xs font-normal text-muted-foreground">players</span>
          </p>
        </div>
      </div>
    </Card>

    <!-- Secondary Filter Bar: Positions, Available Toggle & Search -->
    <Card class="p-3 sm:p-4 bg-card border-border">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <!-- Position Filter Pills -->
        <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          <button
            v-for="pos in positionOptions"
            :key="pos"
            type="button"
            @click="selectedPosition = pos"
            :class="[
              'px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer border',
              selectedPosition === pos
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent',
            ]"
          >
            {{ pos }}
          </button>
        </div>

        <!-- Right Side: Availability Toggle & Search Input -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Available in League Switch -->
          <label class="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground select-none">
            <Switch
              v-model="availableOnly"
              class="data-[state=checked]:bg-emerald-600"
            />
            <span class="inline-flex items-center gap-1">
              <span>Available Only</span>
              <Badge
                variant="secondary"
                class="px-1.5 py-0 text-[10px] font-bold"
                :class="availableOnly ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : ''"
              >
                {{ statsSummary.available }}
              </Badge>
            </span>
          </label>

          <!-- Search Input -->
          <div class="relative min-w-[180px] max-w-xs flex-1 sm:flex-initial">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search player, team, manager..."
              class="h-8 pl-8 pr-2.5 text-xs"
            />
          </div>
        </div>
      </div>
    </Card>

    <!-- Content Feed Section -->
    <div>
      <!-- Skeletons Loading State -->
      <div v-if="loading" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card
          v-for="n in 6"
          :key="n"
          class="p-4 space-y-3 bg-card border-border animate-pulse"
        >
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-muted"></div>
            <div class="flex-1 space-y-1.5">
              <div class="w-3/4 h-4 rounded-md bg-muted"></div>
              <div class="w-1/2 h-3 rounded-md bg-muted/60"></div>
            </div>
            <div class="w-16 h-6 rounded-md bg-muted"></div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-border/50">
            <div class="w-24 h-4 rounded-md bg-muted/60"></div>
            <div class="w-20 h-7 rounded-md bg-muted"></div>
          </div>
        </Card>
      </div>

      <!-- Empty State -->
      <Card
        v-else-if="filteredPlayers.length === 0"
        class="py-12 px-4 text-center bg-card border-border"
      >
        <div class="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
          <div class="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground">
            <Info class="w-6 h-6" />
          </div>
          <h3 class="text-base font-semibold text-foreground">No Trending Players Found</h3>
          <p class="text-xs text-muted-foreground">
            No players match the current position ({{ selectedPosition }}), availability filter, or search query ("{{ searchQuery }}").
          </p>
          <Button
            variant="outline"
            size="sm"
            @click="resetFilters"
            class="mt-2 text-xs font-semibold"
          >
            Reset All Filters
          </Button>
        </div>
      </Card>

      <!-- Grid Cards Layout -->
      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="(player, index) in filteredPlayers"
          :key="player.playerId"
          class="flex flex-col justify-between p-4 transition-all duration-200 border bg-card hover:border-primary/40 hover:shadow-md"
          :class="player.isAvailable ? 'border-emerald-500/25 bg-emerald-500/[0.02]' : 'border-border'"
        >
          <!-- Card Header: Rank, Player Avatar, Identity, Momentum Count -->
          <div>
            <div class="flex items-start justify-between gap-2.5">
              <!-- Left: Rank + Avatar + Names -->
              <div class="flex items-center min-w-0 gap-3">
                <!-- Rank Index -->
                <span class="text-xs font-bold text-muted-foreground w-4 shrink-0 text-right">
                  #{{ index + 1 }}
                </span>

                <!-- Player Headshot -->
                <div class="relative shrink-0">
                  <img
                    :src="player.headshotUrl"
                    :alt="player.name"
                    class="object-cover w-12 h-12 rounded-full border border-border bg-muted/40"
                    loading="lazy"
                    @error="
                      ($event.target as HTMLElement).style.display = 'none';
                    "
                  />
                  <!-- Position Mini Badge Overlay -->
                  <span
                    class="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-sm text-[9px] font-extrabold uppercase shadow-xs border"
                    :class="getPositionBadgeStyle(player.position)"
                  >
                    {{ player.position }}
                  </span>
                </div>

                <!-- Name & Team -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <h3 class="text-sm sm:text-base font-bold truncate text-foreground leading-snug">
                      {{ player.name }}
                    </h3>
                  </div>
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span class="font-semibold uppercase tracking-wider text-[11px] text-foreground/80">
                      {{ player.team || 'FA' }}
                    </span>
                    <span>•</span>
                    <span>{{ player.position }}</span>
                  </div>
                </div>
              </div>

              <!-- Right: Trending Momentum Badge -->
              <div class="flex flex-col items-end shrink-0">
                <Badge
                  :variant="player.type === 'add' ? 'success' : 'destructive'"
                  class="gap-1 px-2 py-0.5 text-xs font-bold shadow-2xs"
                >
                  <component
                    :is="player.type === 'add' ? TrendingUp : TrendingDown"
                    class="w-3.5 h-3.5"
                  />
                  <span>
                    {{ player.type === 'add' ? '+' : '-' }}{{ formatTrendingCount(player.count) }}
                  </span>
                </Badge>
                <span class="text-[10px] text-muted-foreground mt-0.5 font-medium">
                  {{ player.type === 'add' ? 'adds' : 'drops' }} / {{ selectedTimeWindow === 168 ? '7d' : `${selectedTimeWindow}h` }}
                </span>
              </div>
            </div>

            <!-- League Ownership Status Banner -->
            <div class="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
              <!-- Available Free Agent Status -->
              <div v-if="player.isAvailable" class="flex items-center gap-1.5 min-w-0">
                <div class="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Sparkles class="w-3 h-3" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    Free Agent
                  </p>
                  <p class="text-[10px] text-muted-foreground truncate">
                    Available in this league
                  </p>
                </div>
              </div>

              <!-- Rostered Status -->
              <div v-else class="flex items-center gap-1.5 min-w-0">
                <img
                  v-if="player.managerAvatar"
                  :src="player.managerAvatar"
                  alt="Manager avatar"
                  class="w-5 h-5 rounded-full border border-border object-cover shrink-0"
                />
                <div
                  v-else
                  class="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground shrink-0"
                >
                  <UserCheck class="w-3 h-3" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-foreground truncate">
                    {{ store.showUsernames ? player.managerUsername : player.managerName }}
                  </p>
                  <p class="text-[10px] text-muted-foreground truncate">
                    Roster #{{ player.rosterId }}
                  </p>
                </div>
              </div>

              <!-- Copy Name Button -->
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      type="button"
                      @click="copyPlayerName(player)"
                      class="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copy Player Name"
                    >
                      <Check v-if="copiedPlayerId === player.playerId" class="w-3.5 h-3.5 text-emerald-500" />
                      <Copy v-else class="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent class="text-xs">
                    Copy name to clipboard
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <!-- Card Actions Footer -->
          <div class="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-2">
            <!-- If Rostered: Open in Trade Lab -->
            <Button
              v-if="!player.isAvailable"
              variant="outline"
              size="sm"
              class="w-full gap-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
              @click="handleOpenTradeLab(player)"
            >
              <ArrowRightLeft class="w-3.5 h-3.5" />
              <span>Open in Trade Lab</span>
            </Button>

            <!-- If Available: Target on Waivers -->
            <Button
              v-else
              variant="default"
              size="sm"
              class="w-full gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              @click="handleOpenClaimDialog(player)"
            >
              <UserPlus class="w-3.5 h-3.5" />
              <span>Target on Waivers</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>

    <!-- Waiver Claim / Wire Target Dialog -->
    <Dialog v-model:open="claimDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader v-if="selectedPlayerForClaim">
          <div class="flex items-center gap-3">
            <img
              :src="selectedPlayerForClaim.headshotUrl"
              :alt="selectedPlayerForClaim.name"
              class="object-cover w-14 h-14 rounded-full border border-border bg-muted/40"
            />
            <div>
              <DialogTitle class="text-lg font-bold">
                {{ selectedPlayerForClaim.name }}
              </DialogTitle>
              <DialogDescription class="flex items-center gap-2 mt-0.5 text-xs">
                <Badge
                  :class="getPositionBadgeStyle(selectedPlayerForClaim.position)"
                  class="font-bold uppercase text-[10px]"
                >
                  {{ selectedPlayerForClaim.position }}
                </Badge>
                <span>•</span>
                <span class="font-semibold">{{ selectedPlayerForClaim.team || 'Free Agent' }}</span>
                <span>•</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-medium">Free Agent in League</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div v-if="selectedPlayerForClaim" class="space-y-3 py-2 text-xs sm:text-sm">
          <!-- Wire Trend Stats -->
          <div class="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="text-muted-foreground">Market Activity:</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">
                +{{ formatTrendingCount(selectedPlayerForClaim.count) }} adds in last {{ selectedTimeWindow === 168 ? '7 days' : `${selectedTimeWindow} hours` }}
              </span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-muted-foreground">League Status:</span>
              <span class="font-bold text-foreground">Available to claim or add</span>
            </div>
          </div>

          <!-- Recommended FAAB Strategy -->
          <div class="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
            <p class="font-semibold text-foreground text-xs flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-primary" />
              <span>Recommended Wire Move</span>
            </p>
            <p class="text-xs text-muted-foreground">
              This player is experiencing high transaction momentum league-wide. If your league uses FAAB waivers, consider submitting a 3% - 8% bid, or add immediately if free agents are first-come first-serve.
            </p>
          </div>
        </div>

        <DialogFooter class="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5 text-xs font-semibold"
            @click="selectedPlayerForClaim && copyPlayerName(selectedPlayerForClaim)"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>Copy Player Name</span>
          </Button>
          <Button
            type="button"
            size="sm"
            class="text-xs font-bold"
            @click="claimDialogOpen = false"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
