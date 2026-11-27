<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "@/store/store";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Mic,
  Radio,
  Settings2,
} from "@lucide/vue";
import PersonaCustomizer from "./PersonaCustomizer.vue";
import AiNarrativeCard from "@/components/shared/AiNarrativeCard.vue";
import {
  DEFAULT_PODCAST_PERSONAS,
  EXCLUSIVE_PODCAST_LEAGUE_ID,
  EXCLUSIVE_PODCAST_LEAGUE_NAME,
  fetchCachedPodcastEpisode,
  fetchCachedPodcastVault,
  generatePodcastEpisode,
  PODCAST_CAST_PROFILES,
  type PodcastEpisode,
  type PodcastPersonas,
} from "@/api/aiAnalysisApi";

const store = useStore();
const route = useRoute();
const isLoading = ref(false);
const showCustomizer = ref(false);
const episode = ref<PodcastEpisode | null>(null);
const vaultEpisodes = ref<PodcastEpisode[]>([]);
const personas = ref<PodcastPersonas>({ ...DEFAULT_PODCAST_PERSONAS });

const selectedWeek = ref<number>(11);
const selectedTopic = ref<string>(
  "Weekly Matchup Recap, Bench Crimes & Transaction Roast"
);

const topics = [
  "Weekly Matchup Recap, Bench Crimes & Transaction Roast",
  "Playoff Bubble Panic & Fraud Exposure Special",
  "Waiver Wire FAAB Receipts & Trade Police Tribunal",
  "Sacko Punishment Watch & Midnight Lineup Confessions",
];

const fantaLeagueFromStore = computed(() =>
  store.leagueInfo.find((l) => l.leagueId === EXCLUSIVE_PODCAST_LEAGUE_ID)
);

const availableWeeks = computed(() => {
  const maxScored = fantaLeagueFromStore.value?.lastScoredWeek || 11;
  const count = Math.max(1, Math.min(18, maxScored));
  return Array.from({ length: count }, (_, i) => i + 1);
});

const syncDefaultWeek = () => {
  const queryWeek = Number(
    Array.isArray(route.query.week) ? route.query.week[0] : route.query.week
  );
  if (Number.isFinite(queryWeek) && queryWeek >= 1) {
    selectedWeek.value = queryWeek;
    return;
  }
  if (fantaLeagueFromStore.value?.lastScoredWeek) {
    selectedWeek.value = fantaLeagueFromStore.value.lastScoredWeek;
  }
};

const handleSavePersonas = (newPersonas: PodcastPersonas) => {
  personas.value = { ...newPersonas };
  localStorage.setItem("ffw_podcast_personas", JSON.stringify(newPersonas));
  toast.success("Studio cast personalities saved!");
  showCustomizer.value = false;
};

const refreshVault = async () => {
  vaultEpisodes.value = await fetchCachedPodcastVault();
};

const onWeekSelectChange = async () => {
  const cached = await fetchCachedPodcastEpisode({
    leagueId: EXCLUSIVE_PODCAST_LEAGUE_ID,
    week: selectedWeek.value,
  });
  if (cached && cached.week === selectedWeek.value) {
    episode.value = cached;
    return;
  }
  await generatePodcast();
};

const generatePodcast = async () => {
  isLoading.value = true;
  try {
    const data = await generatePodcastEpisode({
      leagueInfo: fantaLeagueFromStore.value ?? {
        leagueId: EXCLUSIVE_PODCAST_LEAGUE_ID,
        name: EXCLUSIVE_PODCAST_LEAGUE_NAME,
      },
      matchups: fantaLeagueFromStore.value?.weeklyPoints || [],
      personas: personas.value,
      week: selectedWeek.value,
      topic: selectedTopic.value,
      synthesizeAudio: true,
    });

    episode.value = data;
    await refreshVault();
    toast.success(`Week ${data.week} Fanta League broadcast ready!`);
  } catch (error) {
    console.error(error);
    toast.error("Failed to generate podcast episode.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const saved =
    localStorage.getItem("ffw_podcast_personas") ||
    localStorage.getItem("podcastPersonas");
  if (saved) {
    try {
      personas.value = { ...DEFAULT_PODCAST_PERSONAS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn("Failed to parse saved personas", e);
    }
  }
  syncDefaultWeek();
  const [cached, vault] = await Promise.all([
    fetchCachedPodcastEpisode({
      leagueId: EXCLUSIVE_PODCAST_LEAGUE_ID,
      week: selectedWeek.value,
    }),
    fetchCachedPodcastVault(),
  ]);
  vaultEpisodes.value = vault;
  if (cached) {
    episode.value = cached;
    selectedWeek.value = cached.week || selectedWeek.value;
    return;
  }
  await generatePodcast();
});
</script>

<template>
  <div class="flex flex-col gap-6 pb-8">
    <!-- Studio Control Deck -->
    <div class="bg-card rounded-2xl border p-5 md:p-6 shadow-xs space-y-5">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
              <Radio class="w-3.5 h-3.5" />
              {{ EXCLUSIVE_PODCAST_LEAGUE_NAME }}
            </span>
            <Badge variant="outline" class="gap-1 text-xs">
              <Clock class="w-3 h-3" />
              Exclusive 8–10 Min Weekly Broadcast
            </Badge>
          </div>
          <h2 class="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Fanta Fantasy League Radio Studio
          </h2>
          <p class="text-muted-foreground text-sm max-w-3xl">
            Exclusively covering <strong>{{ EXCLUSIVE_PODCAST_LEAGUE_NAME }}</strong>—built from real Week {{ selectedWeek }} matchup results, bench blunders, FAAB claims, and trades, voiced by ElevenLabs.
          </p>
        </div>

        <!-- Meet the Booth Pills -->
        <div class="flex items-center gap-2 flex-wrap shrink-0">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/5">
            <img :src="PODCAST_CAST_PROFILES.guru.avatar" class="w-6 h-6 rounded-full" alt="Guru" />
            <div class="text-xs leading-tight">
              <div class="font-bold text-sky-500">{{ personas.guruName || "Dr. Metric" }}</div>
              <div class="text-[10px] text-muted-foreground">Analytics</div>
            </div>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <img :src="PODCAST_CAST_PROFILES.comedian.avatar" class="w-6 h-6 rounded-full" alt="Comedian" />
            <div class="text-xs leading-tight">
              <div class="font-bold text-amber-500">{{ personas.comedianName || "Johnny Two-Screens" }}</div>
              <div class="text-[10px] text-muted-foreground">Roasts</div>
            </div>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <img :src="PODCAST_CAST_PROFILES.reporter.avatar" class="w-6 h-6 rounded-full" alt="Reporter" />
            <div class="text-xs leading-tight">
              <div class="font-bold text-emerald-500">{{ personas.reporterName || "Scoop Sullivan" }}</div>
              <div class="text-[10px] text-muted-foreground">Insider</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls Row -->
      <div class="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 items-end pt-2 border-t border-border/50">
        <div class="space-y-1.5">
          <Label for="hub-week-select" class="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-primary" />
            Episode Week
          </Label>
          <select
            id="hub-week-select"
            v-model.number="selectedWeek"
            @change="onWeekSelectChange"
            class="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-ring"
          >
            <option v-for="w in availableWeeks" :key="w" :value="w">
              Week {{ w }}
              {{ vaultEpisodes.some((ep) => ep.week === w) ? " (Recorded ✓)" : "" }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <Label for="hub-topic-select" class="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-primary" />
            Broadcast Angle
          </Label>
          <select
            id="hub-topic-select"
            v-model="selectedTopic"
            class="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-ring"
          >
            <option v-for="t in topics" :key="t" :value="t">
              {{ t }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-9 gap-1.5 text-xs font-semibold"
            @click="showCustomizer = !showCustomizer"
          >
            <Settings2 class="w-3.5 h-3.5" />
            Cast & Voices
            <component :is="showCustomizer ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            :disabled="isLoading"
            class="h-9 px-4 font-bold text-xs uppercase tracking-wider gap-1.5"
            @click="generatePodcast"
          >
            <Mic class="w-3.5 h-3.5" :class="isLoading ? 'animate-spin' : ''" />
            {{ isLoading ? "Recording..." : `Record Week ${selectedWeek}` }}
          </Button>
        </div>
      </div>

      <PersonaCustomizer
        v-if="showCustomizer"
        :initialPersonas="personas"
        @save="handleSavePersonas"
      />
    </div>

    <!-- Active Episode Player & 6-Act Script -->
    <div v-if="episode">
      <AiNarrativeCard
        :title="episode.title"
        :subtitle="episode.subtitle"
        :badge-text="`Week ${episode.week} Show`"
        :lines="episode.segments"
        :acts="episode.acts"
        :word-count="episode.wordCount"
        :estimated-duration-minutes="episode.estimatedDurationMinutes"
        :audio-url="episode.audioUrl"
        :personas="personas"
        :summary="episode.summary"
        :highlights="episode.highlights"
        :is-mock="episode.isMock"
        :allow-speech="true"
      />
    </div>
  </div>
</template>
