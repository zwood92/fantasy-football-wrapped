<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useStore } from "@/store/store";
import { toast } from "vue-sonner";
import {
  Newspaper,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Send,
  Layers,
  Award,
  TrendingUp,
  History,
  AlertCircle,
  FileText,
  Flame,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateNewsletterContent,
  type NewsletterArticle,
} from "@/api/aiAnalysisApi";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const store = useStore();

const isGenerating = ref(false);
const selectedWeek = ref<number>(10);
const selectedTheme = ref<"gazette" | "roast" | "playoffs" | "dynasty">("gazette");
const customNote = ref<string>("");
const copied = ref(false);

const currentNewsletter = ref<NewsletterArticle | null>(null);
const newsletterHistory = ref<NewsletterArticle[]>([]);

const activeLeague = computed(() => store.currentLeague || store.leagueInfo[0] || null);

const availableWeeks = computed(() => {
  const maxWeek = activeLeague.value?.regularSeasonLength || activeLeague.value?.currentWeek || 14;
  return Array.from({ length: maxWeek }, (_, i) => i + 1);
});

const themes = [
  { id: "gazette", name: "The Gridiron Gazette", desc: "Classic weekly league digest & matchup recaps" },
  { id: "roast", name: "The Weekly Roast", desc: "Savage exposure of bench blunders & taco lineups" },
  { id: "playoffs", name: "The Playoff Hunt", desc: "Clinch scenarios, tiebreaker math & elimination watch" },
  { id: "dynasty", name: "Dynasty Deep Dive", desc: "Rookie stock market, trade leverage & rebuild outlook" },
] as const;

onMounted(async () => {
  if (activeLeague.value) {
    selectedWeek.value = activeLeague.value.lastScoredWeek || activeLeague.value.currentWeek || 10;
  }

  // Load from local storage
  const saved = localStorage.getItem("ffw_newsletter_history");
  if (saved) {
    try {
      newsletterHistory.value = JSON.parse(saved);
      if (newsletterHistory.value.length > 0) {
        currentNewsletter.value = newsletterHistory.value[0];
      }
    } catch (e) {
      console.warn("Failed to parse newsletter history:", e);
    }
  }

  // Check Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("newsletters")
        .select("*")
        .order("week", { ascending: false });

      if (!error && data && data.length > 0) {
        const remoteArticles: NewsletterArticle[] = data.map((d: any) => ({
          id: d.id || `newsletter-${d.week}`,
          title: d.title || `Week ${d.week} Gazette`,
          subtitle: d.subtitle || "The Weekly League Dispatch",
          volume: "Vol. 2024",
          issue: d.week,
          date: d.created_at ? new Date(d.created_at).toLocaleDateString() : "This Week",
          leagueName: activeLeague.value?.name || "The League",
          commissionerNote: d.commissioner_note || "Official weekly newsletter report.",
          sections: [
            {
              heading: "Weekly Dispatch",
              body: d.content || "Archived newsletter content.",
            },
          ],
          topRankings: [],
          hotWaiverPicks: [],
        }));

        const combined = [...newsletterHistory.value];
        for (const rem of remoteArticles) {
          if (!combined.some((n) => n.issue === rem.issue && n.title === rem.title)) {
            combined.push(rem);
          }
        }
        newsletterHistory.value = combined;
        if (!currentNewsletter.value && combined.length > 0) {
          currentNewsletter.value = combined[0];
        }
      }
    } catch (err) {
      console.warn("Error fetching Supabase newsletters:", err);
    }
  }

  // If none exists, generate initial issue
  if (!currentNewsletter.value) {
    generateNewsletter();
  }
});

const generateNewsletter = async () => {
  isGenerating.value = true;

  try {
    const article = await generateNewsletterContent({
      leagueInfo: activeLeague.value,
      week: selectedWeek.value,
      theme: selectedTheme.value,
    });

    if (customNote.value.trim()) {
      article.commissionerNote = customNote.value.trim();
    }

    currentNewsletter.value = article;

    newsletterHistory.value = [
      article,
      ...newsletterHistory.value.filter((n) => !(n.issue === article.issue && n.title === article.title)),
    ].slice(0, 10);

    localStorage.setItem("ffw_newsletter_history", JSON.stringify(newsletterHistory.value));
    toast.success(`Week ${article.issue} Gazette published!`);
  } catch (error) {
    console.error("Failed to generate newsletter:", error);
    toast.error("Failed to generate newsletter. Please try again.");
  } finally {
    isGenerating.value = false;
  }
};

const copyFullNewsletter = async () => {
  if (!currentNewsletter.value) return;

  const nl = currentNewsletter.value;
  let text = `# 📰 ${nl.title.toUpperCase()}\n`;
  text += `*${nl.subtitle}*\n`;
  text += `**${nl.volume} | Issue #${nl.issue} | ${nl.leagueName} | ${nl.date}**\n\n`;
  text += `---\n\n`;
  text += `### 🗣️ COMMISSIONER'S NOTE\n${nl.commissionerNote}\n\n`;
  text += `---\n\n`;

  for (const s of nl.sections) {
    text += `### ${s.heading}\n`;
    if (s.subheading) text += `*${s.subheading}*\n\n`;
    text += `${s.body}\n\n`;
    if (s.callout) text += `> 💡 **${s.callout}**\n\n`;
  }

  if (nl.topRankings && nl.topRankings.length > 0) {
    text += `### 🏆 POWER RANKINGS SNAPSHOT\n`;
    for (const r of nl.topRankings) {
      text += `${r.rank}. **${r.team}** (${r.record}) — ${r.blurb}\n`;
    }
    text += `\n`;
  }

  if (nl.hotWaiverPicks && nl.hotWaiverPicks.length > 0) {
    text += `### ⚡ HOT WAIVER TARGETS\n`;
    for (const w of nl.hotWaiverPicks) {
      text += `• ${w}\n`;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    toast.success("Full newsletter formatted and copied to clipboard!");
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch (err) {
    toast.error("Failed to copy newsletter.");
  }
};

const selectHistoricalNewsletter = (nl: NewsletterArticle) => {
  currentNewsletter.value = nl;
  selectedWeek.value = nl.issue;
  window.scrollTo({ top: 0, behavior: "smooth" });
};
</script>

<template>
  <div class="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
    <!-- Header Banner -->
    <div class="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-secondary/30 to-primary/10 p-6 md:p-8 shadow-lg">
      <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xs">
              <Newspaper class="w-3.5 h-3.5" />
              The League Dispatch
            </span>
            <Badge variant="outline" class="font-semibold text-xs border-primary/30">
              AI Gazette Publisher
            </Badge>
          </div>
          <h1 class="text-3xl md:text-5xl font-black tracking-tight text-foreground uppercase">
            Weekly Newsletters
          </h1>
          <p class="text-sm md:text-base text-muted-foreground max-w-2xl font-medium">
            Publish comprehensive, editorial-style newsletters for {{ activeLeague?.name || "your fantasy league" }}.
            Ready to copy into Discord, Sleeper, GroupMe, or email.
          </p>
        </div>

        <!-- League Context Widget -->
        <div class="bg-background/80 backdrop-blur-sm rounded-2xl p-4 border border-border/80 shadow-sm shrink-0 min-w-[240px]">
          <div class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Active Gazette League
          </div>
          <div class="font-black text-base text-foreground truncate">
            {{ activeLeague?.name || "Championship League" }}
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{{ activeLeague?.season || "2024" }} Season</span>
            <span>•</span>
            <span class="text-primary font-bold">Week {{ selectedWeek }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Publishing Control Console -->
    <div class="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-sm space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Week Selector -->
        <div class="space-y-1.5">
          <Label for="nl-week" class="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-primary" />
            Issue Week
          </Label>
          <select
            id="nl-week"
            v-model="selectedWeek"
            class="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="w in availableWeeks" :key="w" :value="w">
              Week {{ w }} Issue
            </option>
          </select>
        </div>

        <!-- Editorial Theme Selector -->
        <div class="space-y-1.5">
          <Label for="nl-theme" class="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-primary" />
            Editorial Style
          </Label>
          <select
            id="nl-theme"
            v-model="selectedTheme"
            class="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="t in themes" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>

        <!-- Publish Action Button -->
        <div class="sm:col-span-2 lg:col-span-1 flex items-end">
          <Button
            @click="generateNewsletter"
            :disabled="isGenerating"
            class="w-full h-10 gap-2 rounded-xl font-black uppercase tracking-wider text-xs shadow-md transition-transform active:scale-95"
          >
            <Sparkles class="w-4 h-4" :class="isGenerating ? 'animate-spin' : ''" />
            <span>{{ isGenerating ? "PUBLISHING EDITION..." : "PUBLISH GAZETTE" }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Active Newsletter Newspaper Layout -->
    <div v-if="isGenerating" class="p-12 text-center rounded-3xl border border-primary/20 bg-card shadow-sm space-y-4">
      <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
        <Newspaper class="w-8 h-8" />
      </div>
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-foreground">Drafting the Front Page...</h3>
        <p class="text-sm text-muted-foreground max-w-md mx-auto">
          AI sports journalists are compiling matchup recaps, power rankings, and bad beats.
        </p>
      </div>
    </div>

    <div v-else-if="currentNewsletter" class="space-y-6">
      <!-- Newspaper Paper Container -->
      <article class="rounded-3xl border border-border/80 bg-card shadow-xl overflow-hidden font-sans">
        <!-- Newspaper Masthead -->
        <header class="p-6 md:p-8 border-b-4 border-foreground/80 bg-secondary/30 text-center space-y-3">
          <div class="flex items-center justify-between text-xs uppercase font-mono tracking-widest text-muted-foreground border-b border-border/60 pb-2">
            <span>{{ currentNewsletter.volume }}</span>
            <span class="font-black text-foreground">{{ currentNewsletter.leagueName }} OFFICIAL DISPATCH</span>
            <span>ISSUE #{{ currentNewsletter.issue }}</span>
          </div>

          <h2 class="text-3xl md:text-5xl lg:text-6xl font-serif font-black tracking-tight text-foreground uppercase pt-2">
            THE GRIDIRON GAZETTE
          </h2>

          <div class="flex items-center justify-between text-xs font-serif italic text-muted-foreground border-t border-border/60 pt-2 px-2">
            <span>"All the fantasy news fit to roast"</span>
            <span>{{ currentNewsletter.date }}</span>
          </div>
        </header>

        <!-- Newsletter Controls Bar -->
        <div class="px-6 py-3 bg-secondary/50 border-b border-border/60 flex items-center justify-between gap-4 flex-wrap">
          <div class="text-xs font-semibold text-muted-foreground">
            Formatted for Discord, Sleeper, GroupMe & Email
          </div>
          <Button
            @click="copyFullNewsletter"
            size="sm"
            class="h-8 px-3 gap-1.5 rounded-lg text-xs font-bold shadow-xs"
          >
            <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ copied ? "Copied to Clipboard!" : "Copy for League Chat" }}</span>
          </Button>
        </div>

        <!-- Main Content Area -->
        <div class="p-6 md:p-10 space-y-8">
          <!-- Front Page Headline -->
          <div class="space-y-2 border-b border-border/60 pb-6">
            <Badge variant="default" class="text-xs uppercase font-bold tracking-wider mb-1">
              Top Headline
            </Badge>
            <h3 class="text-2xl md:text-4xl font-serif font-bold text-foreground leading-tight">
              {{ currentNewsletter.title }}
            </h3>
            <p class="text-base md:text-lg font-serif italic text-muted-foreground">
              {{ currentNewsletter.subtitle }}
            </p>
          </div>

          <!-- Commissioner's Note -->
          <div class="p-4 md:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
            <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
              <Award class="w-4 h-4" />
              Commissioner's Official Address
            </div>
            <p class="text-sm md:text-base leading-relaxed text-foreground italic font-serif">
              "{{ currentNewsletter.commissionerNote }}"
            </p>
          </div>

          <!-- Editorial Article Sections (2-column on desktop) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            <section
              v-for="(section, idx) in currentNewsletter.sections"
              :key="idx"
              class="space-y-3 p-5 rounded-2xl bg-secondary/20 border border-border/60"
            >
              <h4 class="text-lg md:text-xl font-bold font-serif text-foreground">
                {{ section.heading }}
              </h4>
              <p v-if="section.subheading" class="text-xs uppercase font-bold tracking-wide text-primary">
                {{ section.subheading }}
              </p>
              <div class="text-sm md:text-base leading-relaxed text-muted-foreground whitespace-pre-line font-normal">
                {{ section.body }}
              </div>
              <div
                v-if="section.callout"
                class="mt-3 p-3 rounded-xl bg-card border border-primary/20 text-xs font-semibold text-foreground flex items-center gap-2"
              >
                <Flame class="w-4 h-4 text-amber-500 shrink-0" />
                <span>{{ section.callout }}</span>
              </div>
            </section>
          </div>

          <!-- Power Rankings Digest -->
          <div v-if="currentNewsletter.topRankings && currentNewsletter.topRankings.length > 0" class="pt-4 space-y-4">
            <h4 class="text-xl font-serif font-bold text-foreground flex items-center gap-2">
              <TrendingUp class="w-5 h-5 text-primary" />
              Power Rankings Leaderboard
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                v-for="r in currentNewsletter.topRankings"
                :key="r.rank"
                class="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-1.5"
              >
                <div class="flex items-center justify-between">
                  <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center">
                    #{{ r.rank }}
                  </span>
                  <span class="text-xs font-bold font-mono text-muted-foreground">
                    {{ r.record }}
                  </span>
                </div>
                <div class="font-bold text-sm text-foreground truncate">
                  {{ r.team }}
                </div>
                <p class="text-xs text-muted-foreground leading-snug">
                  {{ r.blurb }}
                </p>
              </div>
            </div>
          </div>

          <!-- Hot Waiver Wire Picks -->
          <div v-if="currentNewsletter.hotWaiverPicks && currentNewsletter.hotWaiverPicks.length > 0" class="p-5 rounded-2xl bg-secondary/40 border border-border/80 space-y-3">
            <h4 class="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles class="w-4 h-4" />
              Hot FAAB & Waiver Targets
            </h4>
            <ul class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <li
                v-for="(w, idx) in currentNewsletter.hotWaiverPicks"
                :key="idx"
                class="p-3 rounded-xl bg-card border border-border text-xs font-semibold text-foreground"
              >
                {{ w }}
              </li>
            </ul>
          </div>
        </div>
      </article>
    </div>

    <!-- Historical Gazette Archives -->
    <div v-if="newsletterHistory.length > 1" class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <History class="w-5 h-5 text-primary" />
          <h2 class="text-xl font-bold text-foreground">Gazette Archives</h2>
        </div>
        <span class="text-xs text-muted-foreground font-semibold">
          {{ newsletterHistory.length }} Published Issues
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(nl, idx) in newsletterHistory"
          :key="idx"
          @click="selectHistoricalNewsletter(nl)"
          class="p-4 rounded-2xl border bg-card hover:bg-secondary/40 cursor-pointer transition-all hover:border-primary/50 shadow-xs space-y-2"
          :class="currentNewsletter?.title === nl.title ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border/70'"
        >
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
              Issue #{{ nl.issue }}
            </span>
            <span class="text-[11px] text-muted-foreground font-mono">
              {{ nl.date }}
            </span>
          </div>
          <h4 class="font-bold font-serif text-sm text-foreground line-clamp-2 leading-snug">
            {{ nl.title }}
          </h4>
          <p class="text-xs text-muted-foreground line-clamp-2">
            {{ nl.subtitle }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
