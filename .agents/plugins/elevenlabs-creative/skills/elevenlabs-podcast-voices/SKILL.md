---
name: elevenlabs-podcast-voices
description: Design, preview, and assign custom ElevenLabs creative voices for the three Fantasy Football Wrapped podcast hosts (Spencer "Dr. Metric" Vance, Johnny "Two-Screens" Russo, and "Scoop" Sullivan) using the elevenlabs-creative MCP server.
---

# ElevenLabs Podcast Voice Design & Synthesis Workflow

Use the `elevenlabs-creative` MCP server (`https://api.elevenlabs.io/v1/mcp-creative`) to create, preview, save, and synthesize voices for the three studio hosts in `src/lib/podcastEngine.ts`.

## 1. Canonical Character Voice Design Prompts

When creating new voices with ElevenLabs Voice Design tools, use these tailored vocal descriptions:

### Host 1 — Spencer "Dr. Metric" Vance (`Analytical Guru`)
- **Voice Design Prompt**: `"Early-30s sharp, fast-talking male quantitative analyst with crisp diction, slightly nasal Ivy-League cadence, and dry, exasperated comedic timing when interrupted. Sounds like an intense sports analytics podcast host."`
- **Target Settings**: Stability `0.45`, Similarity Boost `0.80`, Style `0.35`.

### Host 2 — Johnny "Two-Screens" Russo (`Comedian`)
- **Voice Design Prompt**: `"Late-30s high-energy East Coast sports-radio comic with a warm, slightly raspy baritone, infectious laugh-ready delivery, dramatic emphasis, and rapid-fire roast timing. Sounds like a prime-time morning sports shock jock."`
- **Target Settings**: Stability `0.30` (expressive), Similarity Boost `0.75`, Style `0.65`.

### Host 3 — "Scoop" Sullivan (`Beat Reporter`)
- **Voice Design Prompt**: `"Mid-40s polished, urgent network football insider with authoritative broadcast baritone projection, crisp pacing, and deadpan breaking-news gravitas."`
- **Target Settings**: Stability `0.55`, Similarity Boost `0.85`, Style `0.40`.

## 2. Wiring Created Voices into the App

1. Use the ElevenLabs Creative MCP voice-design or voice-search tools to generate/select the three voices and obtain each `voice_id`.
2. Update `PODCAST_CAST_PROFILES` and `DEFAULT_PODCAST_PERSONAS` in `src/lib/podcastEngine.ts` (`guruVoiceId`, `comedianVoiceId`, `reporterVoiceId`), or enter them in the UI under **Podcast → Cast & Presets**.
3. To render an entire 6-act episode via MCP directly, save generated MP3/WAV files under `public/audio/podcasts/week-<N>.mp3` or set `ELEVENLABS_API_KEY` in `.env` so `POST /api/podcast-audio` can synthesize any league's dynamic weekly script on demand via ElevenLabs' Text-to-Dialogue API (`eleven_v3`).
