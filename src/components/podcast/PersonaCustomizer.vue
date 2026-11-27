<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "vue-sonner";
import {
  Copy,
  Flame,
  LineChart,
  Newspaper,
  RotateCcw,
  Sparkles,
  Volume2,
} from "@lucide/vue";
import {
  DEFAULT_PODCAST_PERSONAS,
  fetchElevenLabsVoices,
  PODCAST_CAST_PROFILES,
  PODCAST_SHOW_PRESETS,
  type ElevenLabsVoiceOption,
  type PodcastPersonas,
  type PodcastShowPreset,
} from "@/api/aiAnalysisApi";

const props = defineProps<{
  initialPersonas: PodcastPersonas;
}>();

const emit = defineEmits<{
  (e: "save", personas: PodcastPersonas): void;
}>();

const personas = ref<PodcastPersonas>({
  ...DEFAULT_PODCAST_PERSONAS,
  ...props.initialPersonas,
});

const elevenLabsConfigured = ref(false);
const availableVoices = ref<ElevenLabsVoiceOption[]>([]);
let previewAudio: HTMLAudioElement | null = null;

watch(
  () => props.initialPersonas,
  (newVal) => {
    personas.value = { ...DEFAULT_PODCAST_PERSONAS, ...newVal };
  },
  { deep: true }
);

onMounted(async () => {
  const result = await fetchElevenLabsVoices();
  elevenLabsConfigured.value = result.configured;
  availableVoices.value = result.voices || [];
});

const applyPreset = (preset: PodcastShowPreset) => {
  personas.value = {
    ...DEFAULT_PODCAST_PERSONAS,
    ...preset.personas,
    guruVoiceId:
      personas.value.guruVoiceId ||
      PODCAST_CAST_PROFILES.guru.defaultElevenLabsVoiceId,
    comedianVoiceId:
      personas.value.comedianVoiceId ||
      PODCAST_CAST_PROFILES.comedian.defaultElevenLabsVoiceId,
    reporterVoiceId:
      personas.value.reporterVoiceId ||
      PODCAST_CAST_PROFILES.reporter.defaultElevenLabsVoiceId,
  };
  emit("save", { ...personas.value });
};

const copyVoiceDesignPrompt = async (prompt: string, label: string) => {
  try {
    await navigator.clipboard.writeText(prompt);
    toast.success(`Copied ${label} ElevenLabs Voice Design prompt!`);
  } catch {
    toast.error("Unable to copy voice design prompt.");
  }
};

const playVoicePreview = (voiceId?: string) => {
  const match = availableVoices.value.find((v) => v.voiceId === voiceId);
  if (!match?.previewUrl) return;
  if (previewAudio) {
    previewAudio.pause();
  }
  previewAudio = new Audio(match.previewUrl);
  void previewAudio.play();
};

const resetDefaults = () => {
  personas.value = { ...DEFAULT_PODCAST_PERSONAS };
  emit("save", { ...personas.value });
};

const save = () => {
  emit("save", { ...personas.value });
};
</script>

<template>
  <div class="space-y-6 pt-5 border-t border-border/60">
    <!-- Studio Presets + ElevenLabs Status -->
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-primary" />
              Gemini 4 Cast Bible & ElevenLabs Voices
            </h3>
            <Badge
              :variant="elevenLabsConfigured ? 'default' : 'outline'"
              class="text-[10px]"
            >
              {{
                elevenLabsConfigured
                  ? `ElevenLabs Connected (${availableVoices.length} voices)`
                  : "ElevenLabs: Add ELEVENLABS_API_KEY in .env"
              }}
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground">
            Gemini 4 writes the unfiltered 8–10m script; ElevenLabs renders each `(speaker, line)` turn with the Voice IDs below.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 text-xs text-muted-foreground"
          @click="resetDefaults"
        >
          <RotateCcw class="w-3.5 h-3.5 mr-1.5" />
          Reset Studio Defaults
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          v-for="preset in PODCAST_SHOW_PRESETS"
          :key="preset.id"
          type="button"
          @click="applyPreset(preset)"
          class="text-left p-3.5 rounded-xl border transition-all cursor-pointer"
          :class="
            personas.presetId === preset.id
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border/70 bg-background/60 hover:border-border hover:bg-secondary/30'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-xs text-foreground">{{ preset.name }}</span>
            <Badge
              v-if="personas.presetId === preset.id"
              variant="default"
              class="text-[10px] px-1.5 py-0"
            >
              Active
            </Badge>
          </div>
          <p class="text-[11px] font-medium text-primary mt-0.5">
            {{ preset.tagline }}
          </p>
          <p class="text-[11px] text-muted-foreground mt-1 leading-snug">
            {{ preset.vibe }}
          </p>
        </button>
      </div>
    </div>

    <!-- 3 Host Character & ElevenLabs Voice Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Host 1: Analytical Guru -->
      <div class="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <img
              :src="PODCAST_CAST_PROFILES.guru.avatar"
              alt="Analytical Guru"
              class="w-10 h-10 rounded-full border border-sky-500/40 bg-background shrink-0"
            />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 text-xs font-bold text-sky-500 uppercase">
                <LineChart class="w-3.5 h-3.5" />
                Analytical Guru
              </div>
              <p class="text-[11px] text-muted-foreground truncate">
                "{{ PODCAST_CAST_PROFILES.guru.catchphrase }}"
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-[10px] shrink-0"
            title="Copy ElevenLabs Creative Voice Design prompt"
            @click="
              copyVoiceDesignPrompt(
                PODCAST_CAST_PROFILES.guru.elevenLabsVoiceDesignPrompt,
                'Dr. Metric'
              )
            "
          >
            <Copy class="w-3 h-3 mr-1" />
            Voice Prompt
          </Button>
        </div>

        <div class="space-y-1">
          <Label for="guru-name" class="text-[11px] uppercase text-muted-foreground">
            Host Name
          </Label>
          <Input
            id="guru-name"
            v-model="personas.guruName"
            class="h-8 text-xs bg-background"
          />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <Label for="guru-voice" class="text-[11px] uppercase text-muted-foreground">
              ElevenLabs Voice ID
            </Label>
            <button
              v-if="availableVoices.some((v) => v.voiceId === personas.guruVoiceId && v.previewUrl)"
              type="button"
              class="text-[10px] font-semibold text-sky-500 inline-flex items-center gap-1 cursor-pointer"
              @click="playVoicePreview(personas.guruVoiceId)"
            >
              <Volume2 class="w-3 h-3" /> Preview
            </button>
          </div>
          <select
            v-if="availableVoices.length > 0"
            id="guru-voice"
            v-model="personas.guruVoiceId"
            class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
          >
            <option
              v-for="v in availableVoices"
              :key="v.voiceId"
              :value="v.voiceId"
            >
              {{ v.name }} ({{ v.category }})
            </option>
          </select>
          <Input
            v-else
            id="guru-voice"
            v-model="personas.guruVoiceId"
            placeholder="ElevenLabs voice_id"
            class="h-8 text-xs font-mono bg-background"
          />
        </div>

        <div class="space-y-1">
          <Label for="guru-bio" class="text-[11px] uppercase text-muted-foreground">
            Gemini 4 Script Directive
          </Label>
          <textarea
            id="guru-bio"
            v-model="personas.guru"
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <!-- Host 2: The Comedian -->
      <div class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <img
              :src="PODCAST_CAST_PROFILES.comedian.avatar"
              alt="The Comedian"
              class="w-10 h-10 rounded-full border border-amber-500/40 bg-background shrink-0"
            />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase">
                <Flame class="w-3.5 h-3.5" />
                Savage Roastmaster
              </div>
              <p class="text-[11px] text-muted-foreground truncate">
                "{{ PODCAST_CAST_PROFILES.comedian.catchphrase }}"
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-[10px] shrink-0"
            title="Copy ElevenLabs Creative Voice Design prompt"
            @click="
              copyVoiceDesignPrompt(
                PODCAST_CAST_PROFILES.comedian.elevenLabsVoiceDesignPrompt,
                'Johnny Two-Screens'
              )
            "
          >
            <Copy class="w-3 h-3 mr-1" />
            Voice Prompt
          </Button>
        </div>

        <div class="space-y-1">
          <Label for="comedian-name" class="text-[11px] uppercase text-muted-foreground">
            Host Name
          </Label>
          <Input
            id="comedian-name"
            v-model="personas.comedianName"
            class="h-8 text-xs bg-background"
          />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <Label for="comedian-voice" class="text-[11px] uppercase text-muted-foreground">
              ElevenLabs Voice ID
            </Label>
            <button
              v-if="availableVoices.some((v) => v.voiceId === personas.comedianVoiceId && v.previewUrl)"
              type="button"
              class="text-[10px] font-semibold text-amber-500 inline-flex items-center gap-1 cursor-pointer"
              @click="playVoicePreview(personas.comedianVoiceId)"
            >
              <Volume2 class="w-3 h-3" /> Preview
            </button>
          </div>
          <select
            v-if="availableVoices.length > 0"
            id="comedian-voice"
            v-model="personas.comedianVoiceId"
            class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
          >
            <option
              v-for="v in availableVoices"
              :key="v.voiceId"
              :value="v.voiceId"
            >
              {{ v.name }} ({{ v.category }})
            </option>
          </select>
          <Input
            v-else
            id="comedian-voice"
            v-model="personas.comedianVoiceId"
            placeholder="ElevenLabs voice_id"
            class="h-8 text-xs font-mono bg-background"
          />
        </div>

        <div class="space-y-1">
          <Label for="comedian-bio" class="text-[11px] uppercase text-muted-foreground">
            Gemini 4 Script Directive
          </Label>
          <textarea
            id="comedian-bio"
            v-model="personas.comedian"
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <!-- Host 3: Beat Reporter -->
      <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <img
              :src="PODCAST_CAST_PROFILES.reporter.avatar"
              alt="Beat Reporter"
              class="w-10 h-10 rounded-full border border-emerald-500/40 bg-background shrink-0"
            />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-500 uppercase">
                <Newspaper class="w-3.5 h-3.5" />
                League Insider
              </div>
              <p class="text-[11px] text-muted-foreground truncate">
                "{{ PODCAST_CAST_PROFILES.reporter.catchphrase }}"
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-[10px] shrink-0"
            title="Copy ElevenLabs Creative Voice Design prompt"
            @click="
              copyVoiceDesignPrompt(
                PODCAST_CAST_PROFILES.reporter.elevenLabsVoiceDesignPrompt,
                'Scoop Sullivan'
              )
            "
          >
            <Copy class="w-3 h-3 mr-1" />
            Voice Prompt
          </Button>
        </div>

        <div class="space-y-1">
          <Label for="reporter-name" class="text-[11px] uppercase text-muted-foreground">
            Host Name
          </Label>
          <Input
            id="reporter-name"
            v-model="personas.reporterName"
            class="h-8 text-xs bg-background"
          />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <Label for="reporter-voice" class="text-[11px] uppercase text-muted-foreground">
              ElevenLabs Voice ID
            </Label>
            <button
              v-if="availableVoices.some((v) => v.voiceId === personas.reporterVoiceId && v.previewUrl)"
              type="button"
              class="text-[10px] font-semibold text-emerald-500 inline-flex items-center gap-1 cursor-pointer"
              @click="playVoicePreview(personas.reporterVoiceId)"
            >
              <Volume2 class="w-3 h-3" /> Preview
            </button>
          </div>
          <select
            v-if="availableVoices.length > 0"
            id="reporter-voice"
            v-model="personas.reporterVoiceId"
            class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
          >
            <option
              v-for="v in availableVoices"
              :key="v.voiceId"
              :value="v.voiceId"
            >
              {{ v.name }} ({{ v.category }})
            </option>
          </select>
          <Input
            v-else
            id="reporter-voice"
            v-model="personas.reporterVoiceId"
            placeholder="ElevenLabs voice_id"
            class="h-8 text-xs font-mono bg-background"
          />
        </div>

        <div class="space-y-1">
          <Label for="reporter-bio" class="text-[11px] uppercase text-muted-foreground">
            Gemini 4 Script Directive
          </Label>
          <textarea
            id="reporter-bio"
            v-model="personas.reporter"
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <Button type="button" size="sm" class="font-bold text-xs" @click="save">
        Save Cast & Voice IDs
      </Button>
    </div>
  </div>
</template>
