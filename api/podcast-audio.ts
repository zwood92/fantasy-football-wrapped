import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import {
  EXCLUSIVE_PODCAST_LEAGUE_ID,
  PODCAST_CAST_PROFILES,
  type PodcastHostId,
  type PodcastPersonas,
} from "../src/lib/podcastEngine.js";

export interface ScriptAudioTurnInput {
  speaker: string;
  text: string;
  voiceId?: string;
  tone?: string;
}

export interface ElevenLabsDialogueInput {
  text: string;
  voice_id: string;
}

const MAX_DIALOGUE_BATCH_CHARS = 1850;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export function resolveHostIdForSpeaker(speaker: string): PodcastHostId {
  const s = (speaker || "").toLowerCase();
  if (s.includes("guru") || s.includes("metric") || s.includes("spencer")) {
    return "guru";
  }
  if (
    s.includes("comedian") ||
    s.includes("johnny") ||
    s.includes("roast") ||
    s.includes("trash")
  ) {
    return "comedian";
  }
  return "reporter";
}

const LEGACY_PREMADE_VOICE_IDS = new Set([
  "nPczCjzI2devNBz1zQrb",
  "N2lVS1w4EtoT3dr4eOWO",
  "onwK4e9ZLuTAKqWW03F9",
]);

export function resolveElevenLabsVoiceId(
  speaker: string,
  personas?: Partial<PodcastPersonas>,
  explicitVoiceId?: string
): string {
  if (
    explicitVoiceId &&
    explicitVoiceId.trim().length > 0 &&
    !LEGACY_PREMADE_VOICE_IDS.has(explicitVoiceId.trim())
  ) {
    return explicitVoiceId.trim();
  }
  const hostId = resolveHostIdForSpeaker(speaker);
  if (hostId === "guru") {
    const candidate = personas?.guruVoiceId;
    return (
      (candidate && !LEGACY_PREMADE_VOICE_IDS.has(candidate)
        ? candidate
        : undefined) ||
      process.env.ELEVENLABS_GURU_VOICE_ID ||
      PODCAST_CAST_PROFILES.guru.defaultElevenLabsVoiceId
    );
  }
  if (hostId === "comedian") {
    const candidate = personas?.comedianVoiceId;
    return (
      (candidate && !LEGACY_PREMADE_VOICE_IDS.has(candidate)
        ? candidate
        : undefined) ||
      process.env.ELEVENLABS_COMEDIAN_VOICE_ID ||
      PODCAST_CAST_PROFILES.comedian.defaultElevenLabsVoiceId
    );
  }
  const candidate = personas?.reporterVoiceId;
  return (
    (candidate && !LEGACY_PREMADE_VOICE_IDS.has(candidate)
      ? candidate
      : undefined) ||
    process.env.ELEVENLABS_REPORTER_VOICE_ID ||
    PODCAST_CAST_PROFILES.reporter.defaultElevenLabsVoiceId
  );
}

export function decorateTurnWithVocalCue(
  text: string,
  tone?: string
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // Keep existing inline cues if Gemini 4 already embedded [laughs], [scoffs], etc.
  if (/^\[[^\]]+\]/.test(trimmed)) return trimmed;

  const t = (tone || "").toLowerCase();
  if (t === "sarcastic") return `[sarcastic] ${trimmed}`;
  if (t === "funny") return `[chuckling] ${trimmed}`;
  if (t === "excited") return `[excited] ${trimmed}`;
  if (t === "dramatic") return `[dramatic] ${trimmed}`;
  return trimmed;
}

/**
 * Splits a full 8–10 minute podcast script (~8,500–10,000 chars) into batches
 * safely under ElevenLabs' 2,000-character per-request limit for /v1/text-to-dialogue.
 */
export function chunkDialogueTurns(
  turns: ElevenLabsDialogueInput[],
  maxChars = MAX_DIALOGUE_BATCH_CHARS
): ElevenLabsDialogueInput[][] {
  const batches: ElevenLabsDialogueInput[][] = [];
  let currentBatch: ElevenLabsDialogueInput[] = [];
  let currentLen = 0;

  for (const turn of turns) {
    const cleanText = turn.text.trim();
    if (!cleanText) continue;

    // If a single turn ever exceeds maxChars, split on sentence boundaries
    if (cleanText.length > maxChars) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentLen = 0;
      }
      const sentences = cleanText.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [
        cleanText,
      ];
      let sliceBuf = "";
      for (const sentence of sentences) {
        if ((sliceBuf + sentence).length > maxChars && sliceBuf.length > 0) {
          batches.push([{ text: sliceBuf.trim(), voice_id: turn.voice_id }]);
          sliceBuf = sentence;
        } else {
          sliceBuf += sentence;
        }
      }
      if (sliceBuf.trim().length > 0) {
        batches.push([{ text: sliceBuf.trim(), voice_id: turn.voice_id }]);
      }
      continue;
    }

    if (currentLen + cleanText.length > maxChars && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentLen = 0;
    }

    currentBatch.push({ text: cleanText, voice_id: turn.voice_id });
    currentLen += cleanText.length;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Strips leading ID3v2 metadata tag from subsequent MP3 chunks so concatenated
 * MP3 frames play seamlessly with accurate scrubbing in HTML5 <audio>.
 */
export function stripLeadingId3v2(buf: Buffer): Buffer {
  if (
    buf.length >= 10 &&
    buf[0] === 0x49 && // 'I'
    buf[1] === 0x44 && // 'D'
    buf[2] === 0x33 // '3'
  ) {
    // Synchsafe 28-bit integer size in bytes 6..9
    const tagSize =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    const hasFooter = (buf[5] & 0x10) !== 0;
    const totalHeaderBytes = 10 + tagSize + (hasFooter ? 10 : 0);
    if (totalHeaderBytes < buf.length) {
      return buf.subarray(totalHeaderBytes);
    }
  }
  return buf;
}

export function concatMp3Buffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];
  const normalized = buffers.map((buf, idx) =>
    idx === 0 ? buf : stripLeadingId3v2(buf)
  );
  return Buffer.concat(normalized);
}

async function synthesizeBatchWithDialogueApi(
  batch: ElevenLabsDialogueInput[],
  apiKey: string,
  modelId: string
): Promise<Buffer> {
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-dialogue?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        inputs: batch,
        model_id: modelId,
        language_code: "en",
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    const error = new Error(
      `ElevenLabs text-to-dialogue failed (${response.status}): ${errBody.slice(0, 240)}`
    );
    (error as any).status = response.status;
    throw error;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function synthesizeTurnWithTtsFallback(
  turn: ElevenLabsDialogueInput,
  apiKey: string
): Promise<Buffer> {
  // Strip inline [cue] tags when falling back to standard multilingual v2 TTS
  const cleanText = turn.text.replace(/\[[^\]]+\]\s*/g, "").trim();
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(turn.voice_id)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${response.status}): ${errBody.slice(0, 240)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function listElevenLabsVoicesHandler(
  _req: Request,
  res: Response
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      configured: false,
      voices: [],
    });
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: { "xi-api-key": apiKey },
    });
    if (!response.ok) {
      return res.status(200).json({
        configured: false,
        error: `ElevenLabs API returned ${response.status}`,
        voices: [],
      });
    }
    const data = (await response.json()) as {
      voices?: Array<{
        voice_id: string;
        name: string;
        category?: string;
        labels?: Record<string, string>;
        preview_url?: string;
      }>;
    };

    const voices = (data.voices ?? []).map((v) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category || "premade",
      accent: v.labels?.accent || "",
      description: v.labels?.description || v.labels?.use_case || "",
      previewUrl: v.preview_url || "",
    }));

    return res.status(200).json({
      configured: true,
      voices,
    });
  } catch (err) {
    return res.status(200).json({
      configured: false,
      error: err instanceof Error ? err.message : "Failed to fetch voices",
      voices: [],
    });
  }
}

export async function synthesizeScriptToMp3Buffer(params: {
  turns: ScriptAudioTurnInput[];
  personas?: Partial<PodcastPersonas>;
  apiKey: string;
  modelId?: string;
  onBatchComplete?: (batchIndex: number, totalBatches: number) => void;
}): Promise<{ buffer: Buffer; batchCount: number; modelUsed: string }> {
  const requestedModel =
    params.modelId || process.env.ELEVENLABS_MODEL_ID || "eleven_v3";

  const dialogueTurns: ElevenLabsDialogueInput[] = params.turns
    .filter(
      (line) => typeof line?.text === "string" && line.text.trim().length > 0
    )
    .map((line) => ({
      text: decorateTurnWithVocalCue(line.text, line.tone),
      voice_id: resolveElevenLabsVoiceId(
        line.speaker,
        params.personas,
        line.voiceId
      ),
    }));

  const batches = chunkDialogueTurns(dialogueTurns, MAX_DIALOGUE_BATCH_CHARS);
  const audioBuffers: Buffer[] = [];
  let activeModel = requestedModel;

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    try {
      const chunkBuf = await synthesizeBatchWithDialogueApi(
        batch,
        params.apiKey,
        activeModel
      );
      audioBuffers.push(chunkBuf);
    } catch (firstErr: any) {
      // If e.g. eleven_v4 model ID isn't accepted by /v1/text-to-dialogue yet, try eleven_v3 before TTS fallback
      if (
        activeModel !== "eleven_v3" &&
        (firstErr?.status === 400 ||
          firstErr?.status === 404 ||
          firstErr?.status === 422)
      ) {
        try {
          activeModel = "eleven_v3";
          const v3Buf = await synthesizeBatchWithDialogueApi(
            batch,
            params.apiKey,
            "eleven_v3"
          );
          audioBuffers.push(v3Buf);
          params.onBatchComplete?.(i + 1, batches.length);
          continue;
        } catch (v3Err: any) {
          if (
            v3Err?.status === 400 ||
            v3Err?.status === 403 ||
            v3Err?.status === 422
          ) {
            activeModel = "eleven_multilingual_v2";
            for (const turn of batch) {
              const turnBuf = await synthesizeTurnWithTtsFallback(
                turn,
                params.apiKey
              );
              audioBuffers.push(turnBuf);
            }
            params.onBatchComplete?.(i + 1, batches.length);
            continue;
          }
          throw v3Err;
        }
      }

      if (
        firstErr?.status === 400 ||
        firstErr?.status === 403 ||
        firstErr?.status === 422
      ) {
        activeModel = "eleven_multilingual_v2";
        for (const turn of batch) {
          const turnBuf = await synthesizeTurnWithTtsFallback(
            turn,
            params.apiKey
          );
          audioBuffers.push(turnBuf);
        }
      } else {
        throw firstErr;
      }
    }
    params.onBatchComplete?.(i + 1, batches.length);
  }

  return {
    buffer: concatMp3Buffers(audioBuffers),
    batchCount: batches.length,
    modelUsed: activeModel,
  };
}

export function getPodcastCachePaths(leagueId?: string, week?: number) {
  const safeLeague = EXCLUSIVE_PODCAST_LEAGUE_ID;
  const safeWeek = Number(week) || 0;
  const dir = path.resolve(process.cwd(), "public", "podcasts");
  const slug =
    safeWeek > 0
      ? `episode-${safeLeague}-week-${safeWeek}`
      : `episode-${safeLeague}`;
  return {
    dir,
    jsonPath: path.join(dir, `${slug}.json`),
    mp3Path: path.join(dir, `${slug}.mp3`),
    publicMp3Url: `/podcasts/${slug}.mp3`,
    latestJsonPath: path.join(dir, "latest-episode.json"),
  };
}

export async function getLatestCachedPodcastHandler(
  req: Request,
  res: Response
) {
  const week = req.query.week ? Number(req.query.week) : undefined;
  const paths = getPodcastCachePaths(EXCLUSIVE_PODCAST_LEAGUE_ID, week);

  try {
    const allEpisodes: any[] = [];
    if (fs.existsSync(paths.dir)) {
      const files = fs
        .readdirSync(paths.dir)
        .filter(
          (f) =>
            f.startsWith(`episode-${EXCLUSIVE_PODCAST_LEAGUE_ID}-week-`) &&
            f.endsWith(".json")
        )
        .sort((a, b) => {
          const wA = Number(a.match(/week-(\d+)/)?.[1] || 0);
          const wB = Number(b.match(/week-(\d+)/)?.[1] || 0);
          return wB - wA;
        });
      for (const file of files) {
        try {
          allEpisodes.push(
            JSON.parse(fs.readFileSync(path.join(paths.dir, file), "utf8"))
          );
        } catch {
          // ignore malformed file
        }
      }
    }

    if (week && fs.existsSync(paths.jsonPath)) {
      const data = JSON.parse(fs.readFileSync(paths.jsonPath, "utf8"));
      return res
        .status(200)
        .json({ found: true, episode: data, episodes: allEpisodes });
    }
    if (allEpisodes.length > 0) {
      return res.status(200).json({
        found: true,
        episode: allEpisodes[0],
        episodes: allEpisodes,
      });
    }
    if (fs.existsSync(paths.latestJsonPath)) {
      const data = JSON.parse(fs.readFileSync(paths.latestJsonPath, "utf8"));
      return res
        .status(200)
        .json({ found: true, episode: data, episodes: [data] });
    }
  } catch (err) {
    console.warn("Error reading cached podcast:", err);
  }
  return res.status(200).json({ found: false, episode: null, episodes: [] });
}

export default async function podcastAudioHandler(
  req: Request,
  res: Response
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      configured: false,
      error:
        "ELEVENLABS_API_KEY is not configured on the server. Add ELEVENLABS_API_KEY to .env to enable ElevenLabs multi-speaker studio audio.",
    });
  }

  const { script, segments, personas, leagueId, week, episodeMeta } = (req.body ||
    {}) as {
    script?: ScriptAudioTurnInput[];
    segments?: ScriptAudioTurnInput[];
    personas?: Partial<PodcastPersonas>;
    leagueId?: string;
    week?: number;
    episodeMeta?: Record<string, any>;
  };

  const rawTurns =
    Array.isArray(segments) && segments.length > 0
      ? segments
      : Array.isArray(script)
        ? script
        : [];

  if (rawTurns.length === 0) {
    return res.status(400).json({
      error: "Missing podcast script array of { speaker, text } lines.",
    });
  }

  try {
    const { buffer: mergedMp3, batchCount, modelUsed } =
      await synthesizeScriptToMp3Buffer({
        turns: rawTurns,
        personas,
        apiKey,
      });

    // Persist MP3 & episode JSON to public/podcasts for instant page reloads when possible
    if (leagueId || week) {
      try {
        const cache = getPodcastCachePaths(leagueId, week);
        fs.mkdirSync(cache.dir, { recursive: true });
        fs.writeFileSync(cache.mp3Path, mergedMp3);
        if (episodeMeta) {
          const savedEp = {
            ...episodeMeta,
            audioUrl: cache.publicMp3Url,
            audioProvider: "elevenlabs",
          };
          fs.writeFileSync(cache.jsonPath, JSON.stringify(savedEp, null, 2));
          fs.writeFileSync(
            cache.latestJsonPath,
            JSON.stringify(savedEp, null, 2)
          );
        }
      } catch (cacheErr) {
        console.warn("Non-fatal: unable to cache podcast MP3 to disk:", cacheErr);
      }
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(mergedMp3.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Audio-Batches", String(batchCount));
    res.setHeader("X-ElevenLabs-Model", modelUsed);
    return res.status(200).send(mergedMp3);
  } catch (error) {
    console.error("ElevenLabs podcast audio synthesis error:", error);
    return res.status(502).json({
      configured: true,
      error:
        error instanceof Error
          ? error.message
          : "Failed to synthesize podcast audio with ElevenLabs.",
    });
  }
}
