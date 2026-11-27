import "dotenv/config";
import fs from "node:fs";
import { GoogleGenAI } from "@google/genai";
import {
  buildGeminiPodcastPrompt,
  EXCLUSIVE_PODCAST_LEAGUE_ID,
  extractWeeklyPodcastFacts,
  PODCAST_CAST_PROFILES,
  summarizePodcastMetrics,
  type PodcastDialogueSegment,
  type RichPodcastEpisode,
} from "../src/lib/podcastEngine.js";
import {
  getPodcastCachePaths,
  synthesizeScriptToMp3Buffer,
} from "../api/podcast-audio.js";
import { loadExclusiveFantaLeagueData } from "../api/_lib/fantaLeagueLoader.js";

const PODCAST_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    week: { type: "number" },
    leagueName: { type: "string" },
    summary: { type: "string" },
    highlights: {
      type: "array",
      items: { type: "string" },
    },
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          speaker: {
            type: "string",
            enum: ["Analytical Guru", "Comedian", "Beat Reporter"],
          },
          characterName: { type: "string" },
          role: { type: "string" },
          act: { type: "string" },
          topic: { type: "string" },
          tone: {
            type: "string",
            enum: [
              "analytical",
              "funny",
              "breaking",
              "dramatic",
              "sarcastic",
              "excited",
            ],
          },
          text: { type: "string" },
        },
        required: ["speaker", "act", "topic", "tone", "text"],
      },
    },
  },
  required: ["title", "subtitle", "summary", "highlights", "segments"],
};

async function generateForWeek(
  weekNum: number,
  leagueInfo: any,
  playerMap: any,
  geminiKey: string,
  elevenKey: string
) {
  const context = extractWeeklyPodcastFacts({
    leagueInfo,
    week: weekNum,
    playerMap,
  });

  console.log(
    `\n=== Week ${weekNum}: Extracted ${context.matchups.length} matchups, ${context.waivers.length} waivers, ${context.trades.length} trades for "${context.leagueName}" ===`
  );

  const rawModel = process.env.GEMINI_MODEL || "gemini-4-neon";
  const modelName = /^gemini-(1\.5|2\.0|2\.5)/i.test(rawModel)
    ? "gemini-4-neon"
    : rawModel;

  console.log(`[Week ${weekNum}] Generating unfiltered 8-10m script with ${modelName}...`);
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const prompt = buildGeminiPodcastPrompt({
    context,
    topic: "Weekly Matchup Recap, Bench Crimes & Transaction Roast",
  });

  const interaction = await ai.interactions.create({
    model: modelName,
    system_instruction:
      "You are an unfiltered, adult-humored sports comedy podcast writers' room (Pardon My Take / Bill Burr / RedZone energy) exclusively covering the \"Don't you want a fanta fanta fantasy league?\". Produce a full-length 8-to-10-minute (1,300–1,650 word, 28–36 segment) three-host dialogue grounded strictly in the provided fantasy football league matchups, bench blunders, waivers, and trades. Never put raw emoji characters inside spoken text—translate emoji team names verbally. Include natural ElevenLabs vocal delivery cues like [laughs], [scoffs], [sighs], or [excited] sparingly at the start of punchlines.",
    input: prompt,
    store: false,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: PODCAST_RESPONSE_SCHEMA,
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) {
    throw new Error(`Gemini 4 returned empty output_text for Week ${weekNum}`);
  }

  let cleanJson = outputText.trim();
  const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) cleanJson = match[1].trim();
  const parsed = JSON.parse(cleanJson);

  const segments: PodcastDialogueSegment[] = (parsed.segments || []).map(
    (seg: any) => {
      const sLower = String(seg.speaker || "").toLowerCase();
      const profile = sLower.includes("guru")
        ? PODCAST_CAST_PROFILES.guru
        : sLower.includes("comedian")
          ? PODCAST_CAST_PROFILES.comedian
          : PODCAST_CAST_PROFILES.reporter;
      const voiceId =
        profile.id === "guru"
          ? process.env.ELEVENLABS_GURU_VOICE_ID ||
            profile.defaultElevenLabsVoiceId
          : profile.id === "comedian"
            ? process.env.ELEVENLABS_COMEDIAN_VOICE_ID ||
              profile.defaultElevenLabsVoiceId
            : process.env.ELEVENLABS_REPORTER_VOICE_ID ||
              profile.defaultElevenLabsVoiceId;

      return {
        speaker: profile.speakerLabel,
        characterName: seg.characterName || profile.characterName,
        voiceId,
        role: seg.role || `${profile.characterName} • ${profile.role}`,
        avatar: profile.avatar,
        text: String(seg.text || "").trim(),
        tone: seg.tone || "excited",
        topic: seg.topic || "League Action",
        act: seg.act || "Main Broadcast",
      };
    }
  );

  const metrics = summarizePodcastMetrics(segments);
  console.log(
    `✓ [Week ${weekNum}] Script ready: "${parsed.title}" — ${segments.length} turns, ${metrics.wordCount} words (~${metrics.estimatedDurationMinutes} min).`
  );

  console.log(
    `[Week ${weekNum}] Synthesizing ${segments.length} speaker lines with ElevenLabs...`
  );
  const { buffer: mp3Buffer, batchCount, modelUsed } =
    await synthesizeScriptToMp3Buffer({
      turns: segments,
      apiKey: elevenKey,
      onBatchComplete: (idx, total) => {
        console.log(`  → [Week ${weekNum}] ElevenLabs batch ${idx}/${total}...`);
      },
    });

  const cache = getPodcastCachePaths(EXCLUSIVE_PODCAST_LEAGUE_ID, weekNum);
  fs.mkdirSync(cache.dir, { recursive: true });
  fs.writeFileSync(cache.mp3Path, mp3Buffer);

  const episodePayload: RichPodcastEpisode & {
    audioUrl: string;
    audioProvider: string;
  } = {
    title: parsed.title,
    subtitle: parsed.subtitle,
    week: weekNum,
    leagueName: context.leagueName,
    summary: parsed.summary,
    highlights: parsed.highlights || [],
    segments,
    script: segments.map((s) => ({
      speaker: s.speaker,
      text: s.text,
      tone: s.tone,
    })),
    acts: metrics.acts,
    wordCount: metrics.wordCount,
    estimatedDurationMinutes: metrics.estimatedDurationMinutes,
    audioUrl: cache.publicMp3Url,
    audioProvider: "elevenlabs",
    generatedAt: new Date().toISOString(),
    isFallback: false,
    isMock: false,
  };

  fs.writeFileSync(cache.jsonPath, JSON.stringify(episodePayload, null, 2));
  fs.writeFileSync(
    cache.latestJsonPath,
    JSON.stringify(episodePayload, null, 2)
  );

  const mb = (mp3Buffer.length / (1024 * 1024)).toFixed(2);
  console.log(
    `🎉 [Week ${weekNum}] Saved MP3 (${mb} MB across ${batchCount} batches using ${modelUsed}) -> ${cache.publicMp3Url}`
  );
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (!geminiKey) throw new Error("Missing GEMINI_API_KEY in .env");
  if (!elevenKey) throw new Error("Missing ELEVENLABS_API_KEY in .env");

  console.log(
    `Loading exclusive Sleeper data for "Don't you want a fanta fanta fantasy league?" (${EXCLUSIVE_PODCAST_LEAGUE_ID})...`
  );
  const { leagueInfo, playerMap, lastScoredWeek } =
    await loadExclusiveFantaLeagueData();

  const argWeeks = process.argv
    .slice(2)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= lastScoredWeek);

  const weeksToGenerate =
    argWeeks.length > 0 ? argWeeks : [lastScoredWeek];

  for (const wk of weeksToGenerate) {
    await generateForWeek(wk, leagueInfo, playerMap, geminiKey, elevenKey);
  }
}

main().catch((err) => {
  console.error("Fanta League podcast generation failed:", err);
  process.exit(1);
});
