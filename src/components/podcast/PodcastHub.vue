<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useStore } from "@/store/store";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Radio, Sparkles, Mic } from "@lucide/vue";
import PersonaCustomizer from "./PersonaCustomizer.vue";
import AiNarrativeCard from "@/components/shared/AiNarrativeCard.vue";
import {
  generatePodcastEpisode,
  DEFAULT_PODCAST_PERSONAS,
  type PodcastEpisode,
} from "@/api/aiAnalysisApi";

const store = useStore();
const isLoading = ref(false);
const episode = ref<PodcastEpisode | null>(null);

const personas = ref({ ...DEFAULT_PODCAST_PERSONAS });

onMounted(() => {
  const savedPersonas = localStorage.getItem("podcastPersonas");
  if (savedPersonas) {
    try {
      personas.value = { ...DEFAULT_PODCAST_PERSONAS, ...JSON.parse(savedPersonas) };
    } catch (e) {
      console.error("Failed to parse saved personas", e);
    }
  }
});

const handleSavePersonas = (newPersonas: any) => {
  personas.value = newPersonas;
  localStorage.setItem("podcastPersonas", JSON.stringify(newPersonas));
  toast.success("Personas updated successfully!");
};

const generatePodcast = async () => {
  const league = store.currentLeague || store.leagueInfo[0];
  if (!league) {
    toast.error("No league selected");
    return;
  }

  isLoading.value = true;
  try {
    const data = await generatePodcastEpisode({
      leagueInfo: league,
      matchups: league.weeklyPoints || [],
      personas: personas.value,
      week: league.lastScoredWeek || league.currentWeek || 10,
    });

    episode.value = data;
    toast.success("Podcast generated successfully!");
  } catch (error) {
    console.error(error);
    toast.error("Failed to generate podcast. Using fallback script.");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="bg-card rounded-2xl border p-6 shadow-sm">
      <div class="flex items-center gap-2 mb-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
          <Radio class="w-3.5 h-3.5" /> AI Sports Radio
        </span>
      </div>
      <h2 class="text-2xl md:text-3xl font-black tracking-tight mb-2 uppercase text-foreground">
        Fantasy Football Radio Hub
      </h2>
      <p class="text-muted-foreground mb-6 text-sm md:text-base">
        Your league's weekly recap, brought to you by AI sports personalities: the Analytical Guru, the Comedian, and the Beat Reporter.
      </p>

      <div class="flex gap-4 mb-6">
        <Button
          @click="generatePodcast"
          :disabled="isLoading"
          size="lg"
          class="font-black text-xs md:text-sm px-6 rounded-xl uppercase tracking-wider gap-2 shadow-md"
        >
          <Mic class="w-4 h-4" :class="isLoading ? 'animate-spin' : ''" />
          {{ isLoading ? "RECORDING IN STUDIO..." : "GENERATE LATEST EPISODE" }}
        </Button>
      </div>

      <PersonaCustomizer :initialPersonas="personas" @save="handleSavePersonas" />
    </div>

    <div v-if="episode">
      <AiNarrativeCard
        :title="episode.title"
        :subtitle="episode.subtitle"
        :badge-text="`Week ${episode.week} Show`"
        :lines="episode.segments"
        :summary="episode.summary"
        :highlights="episode.highlights"
        :is-mock="episode.isMock"
        :allow-speech="true"
      />
    </div>
  </div>
</template>
