<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useStore } from "@/store/store";
import { toast } from "vue-sonner";
import {
  Radio,
  Sparkles,
  Mic,
  Settings2,
  Calendar,
  History,
  Trophy,
  Flame,
  LineChart,
  Newspaper,
  Layers,
  ChevronDown,
  ChevronUp,
  Volume2,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AiNarrativeCard from "@/components/shared/AiNarrativeCard.vue";
import {
  generatePodcastEpisode,
  DEFAULT_PODCAST_PERSONAS,
  type PodcastEpisode,
  type PodcastPersonas,
} from "@/api/aiAnalysisApi";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const store = useStore();

// Episode Generation State
const isGenerating = ref(false);
const showPersonaSettings = ref(false);
const selectedWeek = ref<number>(10);
const selectedTopic = ref<string>("Weekly Matchup Recap & Trash Talk");

const topics = [
  "Weekly Matchup Recap & Trash Talk",
  "Playoff Race & Bubble Elimination Scenarios",
  "Waiver Wire & Trade Deadline Meltdowns",
  "Sacko Watch & Bench Regrets",
  "Rivalry Week Hot Takes",
];

// Personas
const personas = ref<PodcastPersonas>({ ...DEFAULT_PODCAST_PERSONAS });

// Active & Historical Episodes
const currentEpisode = ref<PodcastEpisode | null>(null);
const episodeHistory = ref<PodcastEpisode[]>([]);
const isHistoryLoading = ref(false);

const activeLeague = computed(() => store.currentLeague || store.leagueInfo[0] || null);

// Available weeks based on league data
const availableWeeks = computed(() => {
  const maxWeek = activeLeague.value?.regularSeasonLength || activeLeague.value?.currentWeek || 14;
  return Array.from({ length: maxWeek }, (_, i) => i + 1);
});

onMounted(async () => {
  // Load saved personas if any
  const savedPersonas = localStorage.getItem("ffw_podcast_personas");
  if (savedPersonas) {
    try {
      personas.value = { ...DEFAULT_PODCAST_PERSONAS, ...JSON.parse(savedPersonas) };
    } catch (e) {
      console.warn("Failed to load saved personas:", e);
    }
  }

  // Set default week
  if (activeLeague.value) {
    selectedWeek.value = activeLeague.value.lastScoredWeek || activeLeague.value.currentWeek || 10;
  }

  // Load episode history from LocalStorage
  const savedHistory = localStorage.getItem("ffw_podcast_history");
  if (savedHistory) {
    try {
      episodeHistory.value = JSON.parse(savedHistory);
      if (episodeHistory.value.length > 0) {
        currentEpisode.value = episodeHistory.value[0];
      }
    } catch (e) {
      console.warn("Failed to load podcast history:", e);
    }
  }

  // If Supabase is configured, also query saved podcasts
  if (isSupabaseConfigured()) {
    isHistoryLoading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("podcasts")
        .select("*")
        .order("week", { ascending: false });

      if (!error && data && data.length > 0) {
        // Map any remote records
        const remoteEpisodes: PodcastEpisode[] = data.map((d: any) => ({
          title: d.title || `Week ${d.week} Radio Show`,
          subtitle: d.subtitle || "AI Sports Talk Broadcast",
          week: d.week,
          leagueName: activeLeague.value?.name || "The League",
          summary: d.summary || d.content || "Archived weekly episode.",
          highlights: d.highlights || ["Weekly recap", "Host banter"],
          segments: d.segments || [
            { speaker: "Analytical Guru", text: d.content || "Archived episode audio." },
          ],
          script: d.script || [],
          generatedAt: d.created_at || new Date().toISOString(),
        }));

        // Merge unique by title & week
        const combined = [...episodeHistory.value];
        for (const rem of remoteEpisodes) {
          if (!combined.some((e) => e.week === rem.week && e.title === rem.title)) {
            combined.push(rem);
          }
        }
        episodeHistory.value = combined;
        if (!currentEpisode.value && combined.length > 0) {
          currentEpisode.value = combined[0];
        }
      }
    } catch (err) {
      console.warn("Error fetching Supabase podcasts:", err);
    } finally {
      isHistoryLoading.value = false;
    }
  }

  // If no episode exists, generate initial sample episode
  if (!currentEpisode.value) {
    generateEpisode();
  }
});

const savePersonas = () => {
  localStorage.setItem("ffw_podcast_personas", JSON.stringify(personas.value));
  toast.success("AI host personas saved!");
  showPersonaSettings.value = false;
};

const resetPersonas = () => {
  personas.value = { ...DEFAULT_PODCAST_PERSONAS };
  localStorage.removeItem("ffw_podcast_personas");
  toast.info("Personas reset to studio defaults.");
};

const generateEpisode = async () => {
  isGenerating.value = true;

  try {
    const leagueMatchups = activeLeague.value?.weeklyPoints || [];
    const episode = await generatePodcastEpisode({
      leagueInfo: activeLeague.value,
      matchups: leagueMatchups,
      personas: personas.value,
      week: selectedWeek.value,
      topic: selectedTopic.value,
    });

    currentEpisode.value = episode;

    // Add to history
    episodeHistory.value = [
      episode,
      ...episodeHistory.value.filter((e) => !(e.week === episode.week && e.title === episode.title)),
    ].slice(0, 10);

    localStorage.setItem("ffw_podcast_history", JSON.stringify(episodeHistory.value));
    toast.success(`Week ${episode.week} podcast episode ready!`);
  } catch (error) {
    console.error("Failed to generate episode:", error);
    toast.error("Failed to generate episode. Using studio backup.");
  } finally {
    isGenerating.value = false;
  }
};

const selectHistoricalEpisode = (ep: PodcastEpisode) => {
  currentEpisode.value = ep;
  selectedWeek.value = ep.week;
  window.scrollTo({ top: 0, behavior: "smooth" });
};
</script>

<template>
  <div class="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
    <!-- Studio Header Banner -->
    <div class="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/40 to-primary/10 p-6 md:p-8 shadow-lg">
      <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xs">
              <Radio class="w-3.5 h-3.5 animate-pulse" />
              Fantasy Sports Radio 98.7 AI
            </span>
            <Badge variant="outline" class="font-semibold text-xs border-primary/30">
              Multi-Speaker Studio
            </Badge>
          </div>
          <h1 class="text-3xl md:text-5xl font-black tracking-tight text-foreground uppercase">
            AI Podcast Studio
          </h1>
          <p class="text-sm md:text-base text-muted-foreground max-w-2xl font-medium">
            Dynamic, multi-speaker sports radio debate covering {{ activeLeague?.name || "your fantasy league" }}.
            Featuring the Analytical Guru, the Comedian, and the Beat Reporter.
          </p>
        </div>

        <!-- League Context Widget -->
        <div class="bg-background/80 backdrop-blur-sm rounded-2xl p-4 border border-border/80 shadow-sm shrink-0 min-w-[240px]">
          <div class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Active League Broadcast
          </div>
          <div class="font-black text-base text-foreground truncate">
            {{ activeLeague?.name || "Demo Championship League" }}
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{{ activeLeague?.season || "2024" }} Season</span>
            <span>•</span>
            <span class="text-primary font-bold">Week {{ activeLeague?.lastScoredWeek || activeLeague?.currentWeek || selectedWeek }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Episode Studio Controls Bar -->
    <div class="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-sm space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <!-- Week Selector -->
          <div class="space-y-1.5">
            <Label for="week-select" class="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
              <Calendar class="w-3.5 h-3.5 text-primary" />
              Broadcast Week
            </Label>
            <select
              id="week-select"
              v-model="selectedWeek"
              class="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option v-for="w in availableWeeks" :key="w" :value="w">
                Week {{ w }} {{ w === (activeLeague?.currentWeek || 10) ? "(Current)" : "" }}
              </option>
            </select>
          </div>

          <!-- Topic Selector -->
          <div class="space-y-1.5">
            <Label for="topic-select" class="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-primary" />
              Episode Theme
            </Label>
            <select
              id="topic-select"
              v-model="selectedTopic"
              class="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option v-for="t in topics" :key="t" :value="t">
                {{ t }}
              </option>
            </select>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 shrink-0 pt-2 lg:pt-0">
          <Button
            @click="showPersonaSettings = !showPersonaSettings"
            variant="outline"
            size="default"
            class="h-10 px-4 gap-2 rounded-xl border-border font-semibold text-xs"
          >
            <Settings2 class="w-4 h-4 text-muted-foreground" />
            <span>Cast Personas</span>
            <component :is="showPersonaSettings ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
          </Button>

          <Button
            @click="generateEpisode"
            :disabled="isGenerating"
            size="default"
            class="h-10 px-6 gap-2 rounded-xl font-black uppercase tracking-wider text-xs shadow-md transition-transform active:scale-95"
          >
            <Mic class="w-4 h-4" :class="isGenerating ? 'animate-spin' : ''" />
            <span>{{ isGenerating ? "RECORDING IN STUDIO..." : "GENERATE EPISODE" }}</span>
          </Button>
        </div>
      </div>

      <!-- Persona Customizer Drawer -->
      <div v-if="showPersonaSettings" class="pt-4 mt-4 border-t border-border/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-foreground">Configure Host Personalities</h3>
            <p class="text-xs text-muted-foreground">Customize instructions and tone for each sports talk personality.</p>
          </div>
          <Button @click="resetPersonas" variant="ghost" size="sm" class="text-xs text-muted-foreground h-8">
            <RotateCcw class="w-3 h-3 mr-1" /> Reset Defaults
          </Button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Analytical Guru -->
          <div class="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
            <div class="flex items-center gap-2">
              <img src="/avatars/avatar1.svg" class="w-7 h-7 rounded-full border border-sky-500/40" />
              <div>
                <div class="text-xs font-bold text-sky-500">Dr. Metric</div>
                <div class="text-[10px] text-muted-foreground uppercase font-semibold">Analytical Guru</div>
              </div>
            </div>
            <Input v-model="personas.guru" class="text-xs bg-background" />
          </div>

          <!-- Comedian -->
          <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <div class="flex items-center gap-2">
              <img src="/avatars/avatar2.svg" class="w-7 h-7 rounded-full border border-amber-500/40" />
              <div>
                <div class="text-xs font-bold text-amber-500">Johnny Trash-Talk</div>
                <div class="text-[10px] text-muted-foreground uppercase font-semibold">The Comedian</div>
              </div>
            </div>
            <Input v-model="personas.comedian" class="text-xs bg-background" />
          </div>

          <!-- Beat Reporter -->
          <div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <div class="flex items-center gap-2">
              <img src="/avatars/avatar3.svg" class="w-7 h-7 rounded-full border border-emerald-500/40" />
              <div>
                <div class="text-xs font-bold text-emerald-500">Scoop Sullivan</div>
                <div class="text-[10px] text-muted-foreground uppercase font-semibold">Beat Reporter</div>
              </div>
            </div>
            <Input v-model="personas.reporter" class="text-xs bg-background" />
          </div>
        </div>

        <div class="flex justify-end">
          <Button @click="savePersonas" size="sm" class="rounded-lg text-xs font-bold">
            Save Persona Directives
          </Button>
        </div>
      </div>
    </div>

    <!-- Active Episode Broadcast Card -->
    <div class="space-y-4">
      <div v-if="isGenerating" class="p-12 text-center rounded-3xl border border-primary/20 bg-card shadow-sm space-y-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
          <Radio class="w-8 h-8" />
        </div>
        <div class="space-y-1">
          <h3 class="text-xl font-bold text-foreground">Hosts In The Studio...</h3>
          <p class="text-sm text-muted-foreground max-w-md mx-auto">
            Dr. Metric is calculating win leverage, Johnny is writing roasts, and Scoop is verifying injury reports.
          </p>
        </div>
      </div>

      <div v-else-if="currentEpisode">
        <AiNarrativeCard
          :title="currentEpisode.title"
          :subtitle="currentEpisode.subtitle"
          :badge-text="`Week ${currentEpisode.week} Broadcast`"
          :lines="currentEpisode.segments"
          :summary="currentEpisode.summary"
          :highlights="currentEpisode.highlights"
          :is-mock="currentEpisode.isMock"
          :allow-speech="true"
        />
      </div>
    </div>

    <!-- Studio Vault & Historical Broadcasts -->
    <div v-if="episodeHistory.length > 1" class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <History class="w-5 h-5 text-primary" />
          <h2 class="text-xl font-bold text-foreground">Studio Vault & Past Episodes</h2>
        </div>
        <span class="text-xs text-muted-foreground font-semibold">
          {{ episodeHistory.length }} Recorded Broadcasts
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(ep, idx) in episodeHistory"
          :key="idx"
          @click="selectHistoricalEpisode(ep)"
          class="p-4 rounded-2xl border bg-card hover:bg-secondary/40 cursor-pointer transition-all hover:border-primary/50 shadow-xs space-y-2.5"
          :class="currentEpisode?.title === ep.title ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border/70'"
        >
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
              Week {{ ep.week }}
            </span>
            <span class="text-[11px] text-muted-foreground font-mono">
              {{ new Date(ep.generatedAt).toLocaleDateString() }}
            </span>
          </div>
          <h4 class="font-bold text-sm text-foreground line-clamp-2 leading-snug">
            {{ ep.title }}
          </h4>
          <p class="text-xs text-muted-foreground line-clamp-2">
            {{ ep.summary }}
          </p>
          <div class="pt-1 flex items-center justify-between text-xs text-primary font-semibold">
            <span>{{ ep.segments?.length || ep.script?.length || 6 }} dialogue segments</span>
            <span class="flex items-center gap-1">Play <Volume2 class="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
