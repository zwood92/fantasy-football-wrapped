import { describe, expect, test } from "vitest";
import {
  chunkDialogueTurns,
  concatMp3Buffers,
  decorateTurnWithVocalCue,
  resolveElevenLabsVoiceId,
  stripLeadingId3v2,
} from "../api/podcast-audio";
import { generateStudioPodcastEpisode } from "../src/lib/podcastEngine";

describe("ElevenLabs podcast-audio pipeline", () => {
  test("maps each speaker role to distinct ElevenLabs voice IDs with persona overrides", () => {
    const guruDefault = resolveElevenLabsVoiceId("Analytical Guru");
    const comedianDefault = resolveElevenLabsVoiceId("Comedian");
    const reporterDefault = resolveElevenLabsVoiceId("Beat Reporter");

    expect(new Set([guruDefault, comedianDefault, reporterDefault]).size).toBe(
      3
    );

    const customComedian = resolveElevenLabsVoiceId("Comedian", {
      comedianVoiceId: "custom_johnny_voice_123",
    });
    expect(customComedian).toBe("custom_johnny_voice_123");
  });

  test("chunks a full 8-10 minute (~8,500+ char) script safely under ElevenLabs 2,000-char limit", () => {
    const episode = generateStudioPodcastEpisode({ week: 8, isMock: true });
    const turns = episode.segments.map((seg) => ({
      text: decorateTurnWithVocalCue(seg.text, seg.tone),
      voice_id: resolveElevenLabsVoiceId(seg.speaker),
    }));

    const batches = chunkDialogueTurns(turns, 1850);
    expect(batches.length).toBeGreaterThanOrEqual(4);

    let reconstructedCount = 0;
    for (const batch of batches) {
      const batchChars = batch.reduce((sum, item) => sum + item.text.length, 0);
      expect(batchChars).toBeLessThanOrEqual(1850);
      reconstructedCount += batch.length;
    }
    expect(reconstructedCount).toBe(turns.length);
  });

  test("strips leading ID3v2 headers on subsequent MP3 chunks when concatenating", () => {
    // Minimal 10-byte ID3v2 header declaring a 4-byte body + 3 bytes of MP3 audio frame
    const id3Chunk = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04,
      0xaa, 0xbb, 0xcc, 0xdd,
      0xff, 0xfb, 0x90,
    ]);
    const stripped = stripLeadingId3v2(id3Chunk);
    expect(Array.from(stripped)).toEqual([0xff, 0xfb, 0x90]);

    const merged = concatMp3Buffers([id3Chunk, id3Chunk]);
    // First chunk keeps full 17 bytes; second chunk contributes only 3 audio bytes = 20 bytes
    expect(merged.length).toBe(20);
  });
});
