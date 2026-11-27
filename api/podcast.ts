import { GoogleGenAI } from "@google/genai";
import type { Request, Response } from "express";
import {
  buildGeminiPodcastPrompt,
  EXCLUSIVE_PODCAST_LEAGUE_ID,
  extractWeeklyPodcastFacts,
  generateStudioPodcastEpisode,
  PODCAST_CAST_PROFILES,
  summarizePodcastMetrics,
  type PlayerLookupRecord,
  type PodcastDialogueSegment,
  type PodcastPersonas,
  type RichPodcastEpisode,
} from "../src/lib/podcastEngine.js";
import { loadExclusiveFantaLeagueData } from "./_lib/fantaLeagueLoader.js";

export type PodcastSpeakerSegment = PodcastDialogueSegment;
export type PodcastPayload = RichPodcastEpisode;

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

export function generateFallbackPodcast(
  leagueInfo: any,
  matchupsData: any,
  personas?: Partial<PodcastPersonas>,
  weekNum?: number,
  playerMap?: PlayerLookupRecord,
  topic?: string
): PodcastPayload {
  return generateStudioPodcastEpisode({
    leagueInfo,
    matchupsData,
    personas,
    week: weekNum,
    topic,
    playerMap,
    isMock: true,
  });
}

export default async function podcastHandler(req: Request, res: Response) {
  const { personas, week, topic } = req.body || {};
  let { leagueInfo, matchups, playerMap } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // Enforce exclusive scoping to "Don't you want a fanta fanta fantasy league?" (1313895546825490432)
  let resolvedWeek = week ? Number(week) : undefined;
  try {
    const fanta = await loadExclusiveFantaLeagueData();
    leagueInfo = fanta.leagueInfo;
    matchups = fanta.leagueInfo.weeklyPoints;
    playerMap = { ...(playerMap || {}), ...fanta.playerMap };
    if (!resolvedWeek || resolvedWeek > fanta.lastScoredWeek) {
      resolvedWeek = fanta.lastScoredWeek;
    }
  } catch (err) {
    console.warn(
      `Unable to fetch live Fanta league (${EXCLUSIVE_PODCAST_LEAGUE_ID}), falling back to request payload:`,
      err
    );
  }

  if (!apiKey) {
    const fallbackResponse = generateFallbackPodcast(
      leagueInfo,
      matchups,
      personas,
      resolvedWeek,
      playerMap,
      topic
    );
    res.setHeader("X-AI-Mode", "fallback");
    return res.status(200).json(fallbackResponse);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const context = extractWeeklyPodcastFacts({
      leagueInfo,
      matchupsData: matchups,
      week: resolvedWeek,
      playerMap,
    });
    const prompt = buildGeminiPodcastPrompt({
      context,
      personas,
      topic,
    });

    // Current Gemini 4 frontier model via Interactions API (gemini-2.5-* is deprecated)
    const rawModel = process.env.GEMINI_MODEL || "gemini-4-neon";
    const modelName = /^gemini-(1\.5|2\.0|2\.5)/i.test(rawModel)
      ? "gemini-4-neon"
      : rawModel;

    const interaction = await ai.interactions.create({
      model: modelName,
      system_instruction:
        "You are an unfiltered, adult-humored sports comedy podcast writers' room (Pardon My Take / Bill Burr / RedZone energy). Produce a full-length 8-to-10-minute (1,300–1,650 word, 28–36 segment) three-host dialogue grounded strictly in the provided fantasy football league matchups, bench blunders, waivers, and trades. Include natural ElevenLabs v3 vocal delivery cues like [laughs], [scoffs], [sighs], or [excited] sparingly at the start of punchlines so downstream ElevenLabs Text-to-Dialogue synthesis sounds like a live radio booth.",
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
      throw new Error("Empty output_text returned from Gemini Interactions API");
    }

    let cleanJson = outputText.trim();
    const codeBlockMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      cleanJson = codeBlockMatch[1].trim();
    }

    const scriptJson = JSON.parse(cleanJson);
    const rawSegments: any[] = Array.isArray(scriptJson.segments)
      ? scriptJson.segments
      : Array.isArray(scriptJson.script)
        ? scriptJson.script
        : [];

    if (rawSegments.length < 12) {
      throw new Error(
        `Generated script too short (${rawSegments.length} segments); falling back to full 6-act studio script.`
      );
    }

    const segments: PodcastSpeakerSegment[] = rawSegments.map((seg: any) => {
      const sLower = String(seg.speaker || "").toLowerCase();
      const profile = sLower.includes("guru")
        ? PODCAST_CAST_PROFILES.guru
        : sLower.includes("comedian")
          ? PODCAST_CAST_PROFILES.comedian
          : PODCAST_CAST_PROFILES.reporter;
      const customName =
        profile.id === "guru"
          ? personas?.guruName || profile.characterName
          : profile.id === "comedian"
            ? personas?.comedianName || profile.characterName
            : personas?.reporterName || profile.characterName;
      const customVoiceId =
        profile.id === "guru"
          ? personas?.guruVoiceId || profile.defaultElevenLabsVoiceId
          : profile.id === "comedian"
            ? personas?.comedianVoiceId || profile.defaultElevenLabsVoiceId
            : personas?.reporterVoiceId || profile.defaultElevenLabsVoiceId;

      return {
        speaker: profile.speakerLabel,
        characterName: seg.characterName || customName,
        voiceId: customVoiceId,
        role: seg.role || `${customName} • ${profile.role}`,
        avatar: profile.avatar,
        text: String(seg.text || "").trim(),
        tone: seg.tone || "excited",
        topic: seg.topic || "League Action",
        act: seg.act || "Main Broadcast",
      };
    });

    const metrics = summarizePodcastMetrics(segments);

    const finalResponse: PodcastPayload = {
      title:
        scriptJson.title ||
        `Week ${context.week} Radio: ${context.highScorer.name} vs. The Field`,
      subtitle:
        scriptJson.subtitle ||
        `Full 6-act breakdown of Week ${context.week} in ${context.leagueName} (~${Math.max(8, Math.round(metrics.estimatedDurationMinutes))} min).`,
      week: Number(scriptJson.week) || context.week,
      leagueName: scriptJson.leagueName || context.leagueName,
      summary:
        scriptJson.summary ||
        `Week ${context.week} sports radio recap covering all ${context.matchups.length} matchups and transactions in ${context.leagueName}.`,
      highlights: Array.isArray(scriptJson.highlights)
        ? scriptJson.highlights
        : [
            `${context.highScorer.name} led Week ${context.week} with ${context.highScorer.score.toFixed(1)} pts`,
            `${context.lowScorer.name} posted the weekly low of ${context.lowScorer.score.toFixed(1)} pts`,
          ],
      segments,
      script: segments.map((s) => ({
        speaker: s.speaker,
        text: s.text,
        tone: s.tone,
      })),
      acts: metrics.acts,
      wordCount: metrics.wordCount,
      estimatedDurationMinutes: metrics.estimatedDurationMinutes,
      generatedAt: new Date().toISOString(),
      isFallback: false,
      isMock: false,
    };

    res.setHeader("X-AI-Mode", "gemini");
    return res.status(200).json(finalResponse);
  } catch (error) {
    console.warn(
      "Gemini podcast generation error, falling back to full 6-act studio script:",
      error
    );
    const fallbackResponse = generateFallbackPodcast(
      leagueInfo,
      matchups,
      personas,
      week,
      playerMap,
      topic
    );
    res.setHeader("X-AI-Mode", "fallback");
    return res.status(200).json(fallbackResponse);
  }
}
