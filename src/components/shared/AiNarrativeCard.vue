<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import MarkdownIt from "markdown-it";
import { toast } from "vue-sonner";
import {
  Play,
  Pause,
  Square,
  Copy,
  Check,
  Volume2,
  Radio,
  Sparkles,
  Bot,
  Flame,
  LineChart,
  Newspaper,
  Clock,
  Download,
  Mic,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  synthesizePodcastAudio,
  type PodcastPersonas,
} from "@/api/aiAnalysisApi";
import type { PodcastActSummary } from "@/lib/podcastEngine";

export interface ScriptLine {
  speaker: string;
  characterName?: string;
  voiceId?: string;
  role?: string;
  avatar?: string;
  text: string;
  tone?: string;
  topic?: string;
  act?: string;
}

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    badgeText?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
    lines?: ScriptLine[];
    acts?: PodcastActSummary[];
    wordCount?: number;
    estimatedDurationMinutes?: number;
    audioUrl?: string;
    personas?: Partial<PodcastPersonas>;
    summary?: string;
    highlights?: string[];
    rawContent?: string;
    markdownContent?: string;
    isMock?: boolean;
    allowSpeech?: boolean;
    initialTab?: "dialogue" | "summary" | "markdown";
  }>(),
  {
    title: "AI Analysis & Narrative",
    subtitle: "",
    badgeText: "AI Generated",
    badgeVariant: "secondary",
    lines: () => [],
    summary: "",
    highlights: () => [],
    rawContent: "",
    markdownContent: "",
    isMock: false,
    allowSpeech: true,
    initialTab: "dialogue",
  }
);

const activeTab = ref<"dialogue" | "summary" | "markdown">(props.initialTab);
const md = new MarkdownIt({ html: false, breaks: true, linkify: true });

// Copy State
const copied = ref(false);

const copyContent = async () => {
  let fullText = "";
  if (props.lines && props.lines.length > 0) {
    fullText = `${props.title}\n${props.subtitle}\n\n` +
      props.lines.map((l) => `${l.speaker} (${l.role || "Host"}): "${l.text}"`).join("\n\n");
  } else if (props.markdownContent) {
    fullText = props.markdownContent;
  } else if (props.rawContent) {
    fullText = props.rawContent;
  } else {
    fullText = props.summary || "";
  }

  try {
    await navigator.clipboard.writeText(fullText);
    copied.value = true;
    toast.success("Script copied to clipboard!");
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch (err) {
    toast.error("Failed to copy to clipboard.");
  }
};

// Speech Synthesis & ElevenLabs Studio Audio State
const isPlaying = ref(false);
const isPaused = ref(false);
const currentLineIndex = ref<number>(-1);
const playbackRate = ref<number>(1.0);
const playbackRates = [1.0, 1.25, 1.5, 2.0];
let simulationTimer: ReturnType<typeof setTimeout> | null = null;

const studioAudioUrl = ref<string | null>(props.audioUrl || null);
const isSynthesizingElevenLabs = ref(false);
const htmlAudioRef = ref<HTMLAudioElement | null>(null);
const audioCurrentTime = ref(0);
const audioDuration = ref(0);

watch(
  () => props.audioUrl,
  (nextUrl) => {
    studioAudioUrl.value = nextUrl || null;
  }
);

const generateElevenLabsVoiceTrack = async () => {
  if (!props.lines || props.lines.length === 0) return;
  isSynthesizingElevenLabs.value = true;
  try {
    const result = await synthesizePodcastAudio({
      segments: props.lines as any,
      personas: props.personas,
    });
    if (result.audioUrl) {
      stopPlayback();
      studioAudioUrl.value = result.audioUrl;
      toast.success("ElevenLabs 3-host studio audio ready!");
    } else if (!result.configured) {
      toast.info(
        "Add ELEVENLABS_API_KEY in .env to render ElevenLabs voices (using browser voice preview for now)."
      );
    } else {
      toast.error(result.error || "ElevenLabs audio synthesis failed.");
    }
  } finally {
    isSynthesizingElevenLabs.value = false;
  }
};

const onStudioAudioTimeUpdate = () => {
  const el = htmlAudioRef.value;
  if (!el) return;
  audioCurrentTime.value = el.currentTime;
  audioDuration.value = el.duration || 0;
  if (props.lines && props.lines.length > 0 && audioDuration.value > 0) {
    const progress = Math.min(0.999, el.currentTime / audioDuration.value);
    currentLineIndex.value = Math.floor(progress * props.lines.length);
  }
};

const onStudioAudioPlay = () => {
  isPlaying.value = true;
  isPaused.value = false;
};

const onStudioAudioPause = () => {
  if (htmlAudioRef.value?.ended) {
    isPlaying.value = false;
    isPaused.value = false;
    currentLineIndex.value = -1;
  } else {
    isPaused.value = true;
  }
};

const onStudioAudioEnded = () => {
  isPlaying.value = false;
  isPaused.value = false;
  currentLineIndex.value = -1;
};

const isSpeechAvailable = computed(() => {
  return typeof window !== "undefined" && "speechSynthesis" in window;
});

const getSpeakerMeta = (speaker: string) => {
  const s = speaker.toLowerCase();
  if (s.includes("guru") || s.includes("dr. metric") || s.includes("analytical")) {
    return {
      avatar: "/avatars/avatar1.svg",
      role: "Sabermetrics & Expected Points",
      colorClass: "text-sky-500 dark:text-sky-400",
      borderClass: "border-sky-500/30",
      bgClass: "bg-sky-500/10",
      icon: LineChart,
      bubbleClass: "bg-sky-500/5 dark:bg-sky-950/20 border-sky-500/20",
    };
  }
  if (s.includes("comedian") || s.includes("johnny") || s.includes("trash")) {
    return {
      avatar: "/avatars/avatar2.svg",
      role: "Hot Takes & Savage Roasts",
      colorClass: "text-amber-500 dark:text-amber-400",
      borderClass: "border-amber-500/30",
      bgClass: "bg-amber-500/10",
      icon: Flame,
      bubbleClass: "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/20",
    };
  }
  if (s.includes("reporter") || s.includes("scoop") || s.includes("insider")) {
    return {
      avatar: "/avatars/avatar3.svg",
      role: "Breaking News & Locker Room",
      colorClass: "text-emerald-500 dark:text-emerald-400",
      borderClass: "border-emerald-500/30",
      bgClass: "bg-emerald-500/10",
      icon: Newspaper,
      bubbleClass: "bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20",
    };
  }
  return {
    avatar: "/avatars/avatar4.svg",
    role: "Analyst",
    colorClass: "text-primary",
    borderClass: "border-primary/30",
    bgClass: "bg-primary/10",
    icon: Bot,
    bubbleClass: "bg-secondary/40 border-border",
  };
};

const getToneBadge = (tone?: string) => {
  if (!tone) return null;
  const t = tone.toLowerCase();
  if (t === "breaking") return { label: "Breaking", class: "bg-red-500/10 text-red-500 border-red-500/20" };
  if (t === "sarcastic" || t === "funny") return { label: "Roast", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  if (t === "analytical") return { label: "Data Dive", class: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  if (t === "excited") return { label: "Hyped", class: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
  return { label: tone, class: "bg-secondary text-secondary-foreground" };
};

// Play / Speak Controller
const stopPlayback = () => {
  isPlaying.value = false;
  isPaused.value = false;
  currentLineIndex.value = -1;

  if (htmlAudioRef.value) {
    htmlAudioRef.value.pause();
    htmlAudioRef.value.currentTime = 0;
  }
  if (isSpeechAvailable.value) {
    window.speechSynthesis.cancel();
  }
  if (simulationTimer) {
    clearTimeout(simulationTimer);
    simulationTimer = null;
  }
};

const speakLineAt = (index: number) => {
  if (!props.lines || index >= props.lines.length) {
    stopPlayback();
    return;
  }

  currentLineIndex.value = index;
  const line = props.lines[index];

  if (isSpeechAvailable.value && window.speechSynthesis) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.rate = playbackRate.value;

    const voices = window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang?.toLowerCase().startsWith("en"));

    // Distinct voice & pitch styling according to persona
    const speakerLower = line.speaker.toLowerCase();
    if (speakerLower.includes("guru")) {
      if (voices[0]) utterance.voice = voices[0];
      utterance.pitch = 0.92;
    } else if (speakerLower.includes("comedian")) {
      if (voices[1] || voices[0]) utterance.voice = voices[1] || voices[0];
      utterance.pitch = 1.12;
      utterance.rate = Math.min(2.0, playbackRate.value * 1.05);
    } else if (speakerLower.includes("reporter")) {
      if (voices[2] || voices[0]) utterance.voice = voices[2] || voices[0];
      utterance.pitch = 1.02;
    }

    utterance.onend = () => {
      if (isPlaying.value && !isPaused.value) {
        speakLineAt(index + 1);
      }
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      if (isPlaying.value && !isPaused.value) {
        speakLineAt(index + 1);
      }
    };

    window.speechSynthesis.speak(utterance);
  } else {
    // Simulated visual ticker if speech synthesis is not supported
    const wordCount = line.text.split(" ").length;
    const durationMs = Math.max(1500, (wordCount / (2.5 * playbackRate.value)) * 1000);
    simulationTimer = setTimeout(() => {
      if (isPlaying.value && !isPaused.value) {
        speakLineAt(index + 1);
      }
    }, durationMs);
  }
};

const togglePlayPause = () => {
  if (!props.lines || props.lines.length === 0) return;

  if (studioAudioUrl.value && htmlAudioRef.value) {
    htmlAudioRef.value.playbackRate = playbackRate.value;
    if (htmlAudioRef.value.paused) {
      void htmlAudioRef.value.play();
    } else {
      htmlAudioRef.value.pause();
    }
    return;
  }

  if (!isPlaying.value) {
    isPlaying.value = true;
    isPaused.value = false;
    const startIndex = currentLineIndex.value >= 0 ? currentLineIndex.value : 0;
    speakLineAt(startIndex);
  } else if (isPaused.value) {
    isPaused.value = false;
    if (isSpeechAvailable.value && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      speakLineAt(currentLineIndex.value);
    }
  } else {
    isPaused.value = true;
    if (isSpeechAvailable.value && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    if (simulationTimer) {
      clearTimeout(simulationTimer);
      simulationTimer = null;
    }
  }
};

const jumpToLine = (index: number) => {
  if (studioAudioUrl.value && htmlAudioRef.value && props.lines?.length) {
    currentLineIndex.value = index;
    if (htmlAudioRef.value.duration > 0) {
      htmlAudioRef.value.currentTime =
        (index / props.lines.length) * htmlAudioRef.value.duration;
    }
    htmlAudioRef.value.playbackRate = playbackRate.value;
    void htmlAudioRef.value.play();
    return;
  }
  isPlaying.value = true;
  isPaused.value = false;
  speakLineAt(index);
};

const cycleSpeed = () => {
  const currentIndex = playbackRates.indexOf(playbackRate.value);
  const nextIndex = (currentIndex + 1) % playbackRates.length;
  playbackRate.value = playbackRates[nextIndex];
  if (studioAudioUrl.value && htmlAudioRef.value) {
    htmlAudioRef.value.playbackRate = playbackRate.value;
    return;
  }
  if (isPlaying.value && !isPaused.value) {
    speakLineAt(currentLineIndex.value);
  }
};

const renderedMarkdown = computed(() => {
  if (props.markdownContent) {
    return md.render(props.markdownContent);
  }
  return "";
});

watch(
  () => props.lines,
  () => {
    stopPlayback();
  }
);

onUnmounted(() => {
  stopPlayback();
});
</script>

<template>
  <div class="w-full rounded-2xl border border-border/80 bg-card text-card-foreground shadow-md overflow-hidden transition-all">
    <!-- Header with Studio / AI Broadcast Styling -->
    <div class="p-5 md:p-6 border-b border-border/60 bg-gradient-to-r from-secondary/40 via-card to-secondary/20">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <Radio class="w-3.5 h-3.5" :class="isPlaying && !isPaused ? 'animate-pulse text-red-500' : ''" />
              {{ badgeText }}
            </span>
            <Badge v-if="estimatedDurationMinutes" variant="secondary" class="text-xs gap-1 font-semibold">
              <Clock class="w-3 h-3" />
              ~{{ Math.round(estimatedDurationMinutes) }} min<template v-if="wordCount"> · {{ wordCount.toLocaleString() }} words</template>
            </Badge>
            <Badge v-if="isMock" variant="outline" class="text-xs font-normal text-muted-foreground border-dashed">
              Studio Script Engine
            </Badge>
            <Badge v-if="isPlaying && !isPaused" variant="destructive" class="animate-pulse text-xs uppercase">
              • ON AIR
            </Badge>
          </div>
          <h3 class="text-xl md:text-2xl font-black tracking-tight text-foreground">
            {{ title }}
          </h3>
          <p v-if="subtitle" class="text-sm text-muted-foreground font-medium">
            {{ subtitle }}
          </p>
        </div>

        <!-- Audio Player & Action Controls -->
        <div class="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <!-- Speech / Audio Controls (if lines present and allowSpeech is true) -->
          <div v-if="allowSpeech && lines && lines.length > 0" class="flex items-center bg-secondary/80 rounded-xl p-1 border border-border/80 shadow-inner">
            <Button
              @click="togglePlayPause"
              size="sm"
              :variant="isPlaying && !isPaused ? 'default' : 'ghost'"
              class="h-8 px-3 gap-1.5 rounded-lg font-bold transition-transform active:scale-95"
            >
              <Pause v-if="isPlaying && !isPaused" class="w-4 h-4 fill-current" />
              <Play v-else class="w-4 h-4 fill-current" />
              <span>{{ isPlaying && !isPaused ? "Pause" : isPaused ? "Resume" : "Listen" }}</span>
            </Button>

            <Button
              v-if="isPlaying"
              @click="stopPlayback"
              size="sm"
              variant="ghost"
              class="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground"
              title="Stop playback"
            >
              <Square class="w-3.5 h-3.5 fill-current" />
            </Button>

            <Button
              @click="cycleSpeed"
              size="sm"
              variant="ghost"
              class="h-8 px-2 text-xs font-mono font-bold rounded-lg text-muted-foreground hover:text-foreground"
              title="Playback speed"
            >
              {{ playbackRate }}x
            </Button>
          </div>

          <!-- ElevenLabs Studio Audio Synthesis Button -->
          <Button
            v-if="allowSpeech && lines && lines.length > 0 && !studioAudioUrl"
            @click="generateElevenLabsVoiceTrack"
            :disabled="isSynthesizingElevenLabs"
            size="sm"
            variant="default"
            class="h-9 px-3.5 gap-1.5 rounded-xl font-bold text-xs"
          >
            <Mic class="w-3.5 h-3.5" :class="isSynthesizingElevenLabs ? 'animate-spin' : ''" />
            <span>{{ isSynthesizingElevenLabs ? "Rendering ElevenLabs Voices..." : "ElevenLabs Voices" }}</span>
          </Button>

          <!-- Download MP3 when ElevenLabs audio is ready -->
          <a
            v-if="studioAudioUrl"
            :href="studioAudioUrl"
            :download="`${(title || 'ffwrapped-podcast').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp3`"
            class="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            <Download class="w-3.5 h-3.5" />
            MP3
          </a>

          <!-- Copy Button -->
          <Button
            @click="copyContent"
            size="sm"
            variant="outline"
            class="h-9 px-3 gap-1.5 rounded-xl border-border/80 hover:bg-secondary/60"
          >
            <Check v-if="copied" class="w-4 h-4 text-emerald-500" />
            <Copy v-else class="w-4 h-4 text-muted-foreground" />
            <span class="text-xs font-semibold">{{ copied ? "Copied!" : "Copy" }}</span>
          </Button>
        </div>
      </div>

      <!-- Native ElevenLabs Multi-Speaker Studio Audio Deck -->
      <div
        v-if="studioAudioUrl"
        class="mt-4 pt-3 border-t border-border/50 space-y-2"
      >
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-primary flex items-center gap-1.5">
            <Volume2 class="w-4 h-4" />
            ElevenLabs Multi-Speaker Studio Broadcast
          </span>
          <span class="text-muted-foreground font-mono text-[11px]">
            Spencer · Johnny Two-Screens · Scoop
          </span>
        </div>
        <audio
          ref="htmlAudioRef"
          :src="studioAudioUrl"
          controls
          class="w-full h-10 rounded-lg"
          @timeupdate="onStudioAudioTimeUpdate"
          @play="onStudioAudioPlay"
          @pause="onStudioAudioPause"
          @ended="onStudioAudioEnded"
        />
      </div>

      <!-- Animated Audio Waveform (when on air) -->
      <div v-if="isPlaying && !isPaused" class="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-3 text-xs text-primary">
        <div class="flex items-center gap-1.5 font-semibold">
          <Volume2 class="w-4 h-4 animate-bounce" />
          <span>Broadcasting: Line {{ currentLineIndex + 1 }} of {{ lines.length }}</span>
        </div>
        <div class="flex items-center gap-1 h-4">
          <span class="w-1 bg-primary rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2"></span>
          <span class="w-1 bg-primary rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-4"></span>
          <span class="w-1 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.2s] h-3"></span>
          <span class="w-1 bg-primary rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.3s] h-4"></span>
          <span class="w-1 bg-primary rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.15s] h-2"></span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 mt-4 pt-2 border-t border-border/40 overflow-x-auto text-xs font-semibold">
        <button
          v-if="lines && lines.length > 0"
          @click="activeTab = 'dialogue'"
          class="px-3 py-1.5 rounded-lg transition-all"
          :class="activeTab === 'dialogue' ? 'bg-primary text-primary-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'"
        >
          Studio Dialogue ({{ lines.length }})
        </button>

        <button
          v-if="summary || (highlights && highlights.length > 0)"
          @click="activeTab = 'summary'"
          class="px-3 py-1.5 rounded-lg transition-all"
          :class="activeTab === 'summary' ? 'bg-primary text-primary-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'"
        >
          Summary & Highlights
        </button>

        <button
          v-if="markdownContent || rawContent"
          @click="activeTab = 'markdown'"
          class="px-3 py-1.5 rounded-lg transition-all"
          :class="activeTab === 'markdown' ? 'bg-primary text-primary-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'"
        >
          Full Article / Notes
        </button>
      </div>
    </div>

    <!-- Content Body -->
    <div class="p-5 md:p-6 space-y-4">
      <!-- TAB 1: STUDIO SCRIPT DIALOGUE -->
      <div v-if="activeTab === 'dialogue' && lines && lines.length > 0" class="space-y-4">
        <!-- Clickable 6-Act Chapter Bar -->
        <div
          v-if="acts && acts.length > 1"
          class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/50"
        >
          <button
            v-for="chapter in acts"
            :key="chapter.act"
            type="button"
            @click="jumpToLine(chapter.startIndex)"
            class="shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
            :class="
              currentLineIndex >= chapter.startIndex &&
              currentLineIndex < chapter.startIndex + chapter.segmentCount
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            "
          >
            {{ chapter.act }}
            <span class="opacity-70 ml-1">({{ chapter.segmentCount }})</span>
          </button>
        </div>

        <template v-for="(line, idx) in lines" :key="idx">
          <div
            v-if="line.act && (idx === 0 || lines[idx - 1]?.act !== line.act)"
            class="pt-3 pb-1 flex items-center gap-2"
          >
            <span class="text-xs font-black uppercase tracking-widest text-primary">
              {{ line.act }}
            </span>
            <div class="h-px flex-1 bg-border/60" />
          </div>
          <div
            @click="jumpToLine(idx)"
            class="group relative flex gap-3.5 md:gap-4 p-3.5 md:p-4 rounded-xl border transition-all cursor-pointer select-text"
            :class="[
              currentLineIndex === idx
                ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md -translate-y-0.5'
                : 'border-border/60 hover:border-border hover:bg-secondary/30',
            ]"
          >
            <!-- Persona Avatar & Icon -->
            <div class="relative shrink-0 flex flex-col items-center">
              <img
                :src="line.avatar || getSpeakerMeta(line.speaker).avatar"
                :alt="line.speaker"
                class="w-11 h-11 md:w-12 md:h-12 rounded-full border-2 bg-secondary object-cover shadow-sm"
                :class="getSpeakerMeta(line.speaker).borderClass"
              />
              <span
                class="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border shadow-xs"
                :class="getSpeakerMeta(line.speaker).colorClass"
              >
                <component :is="getSpeakerMeta(line.speaker).icon" class="w-3 h-3" />
              </span>
            </div>

            <!-- Dialogue Bubble & Host Details -->
            <div class="flex-1 min-w-0 space-y-1.5">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="font-black text-sm uppercase tracking-wide" :class="getSpeakerMeta(line.speaker).colorClass">
                    {{ line.characterName || line.speaker }}
                  </span>
                  <span class="text-xs text-muted-foreground font-medium hidden sm:inline">
                    • {{ line.role || getSpeakerMeta(line.speaker).role }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5">
                  <span
                    v-if="line.topic"
                    class="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-secondary/80 text-secondary-foreground"
                  >
                    {{ line.topic }}
                  </span>
                  <span
                    v-if="getToneBadge(line.tone)"
                    class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                    :class="getToneBadge(line.tone)?.class"
                  >
                    {{ getToneBadge(line.tone)?.label }}
                  </span>
                </div>
              </div>

              <!-- Speech Text -->
              <p class="text-sm md:text-base leading-relaxed text-foreground font-normal">
                {{ line.text }}
              </p>
            </div>

            <!-- Play line trigger on hover -->
            <div class="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
              <Button size="icon" variant="ghost" class="w-7 h-7 rounded-lg">
                <Play class="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary fill-current" />
              </Button>
            </div>
          </div>
        </template>
      </div>

      <!-- TAB 2: SUMMARY & HIGHLIGHTS -->
      <div v-else-if="activeTab === 'summary'" class="space-y-6">
        <div v-if="summary" class="p-4 rounded-xl bg-secondary/30 border border-border/60">
          <h4 class="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
            <Sparkles class="w-4 h-4" />
            Executive Recap
          </h4>
          <p class="text-sm md:text-base leading-relaxed text-foreground">
            {{ summary }}
          </p>
        </div>

        <div v-if="highlights && highlights.length > 0" class="space-y-2.5">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Key Episode Highlights & Takeaways
          </h4>
          <ul class="grid gap-2">
            <li
              v-for="(item, idx) in highlights"
              :key="idx"
              class="flex items-start gap-2.5 p-3 rounded-lg border border-border/40 bg-card text-sm leading-snug"
            >
              <span class="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 mt-0.5">
                {{ idx + 1 }}
              </span>
              <span class="text-foreground font-medium">{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- TAB 3: MARKDOWN / RAW TEXT -->
      <div v-else-if="activeTab === 'markdown'" class="prose dark:prose-invert max-w-none text-sm md:text-base leading-relaxed">
        <div v-if="markdownContent" v-html="renderedMarkdown"></div>
        <div v-else-if="rawContent" class="whitespace-pre-wrap font-mono text-xs bg-secondary/40 p-4 rounded-xl border border-border">
          {{ rawContent }}
        </div>
      </div>
    </div>
  </div>
</template>
