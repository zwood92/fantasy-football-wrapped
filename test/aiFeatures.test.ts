import { describe, it, expect, vi } from "vitest";
import {
  generatePodcastEpisode,
  createClientFallbackPodcast,
  generateTradeAnalysis,
  generateTeamDiagnostic,
  generateWeeklyRecapSummary,
  generateNewsletterContent,
  DEFAULT_PODCAST_PERSONAS,
} from "../src/api/aiAnalysisApi";
import { generateFallbackPodcast } from "../api/podcast";

describe("AI Features Layer", () => {
  describe("Podcast Fallback Generator (Backend api/podcast.ts)", () => {
    it("generates structured multi-speaker sports radio podcast script", () => {
      const mockLeague = { name: "Sunday Champions", currentWeek: 8 };
      const mockMatchups = [
        {
          team1: { name: "Championship Chasers", points: 142.4 },
          team2: { name: "Bench Warmers", points: 89.2 },
        },
        {
          team1: { name: "Gridiron Gurus", points: 119.5 },
          team2: { name: "Touchdown Terrors", points: 118.9 },
        },
      ];

      const podcast = generateFallbackPodcast(mockLeague, mockMatchups, DEFAULT_PODCAST_PERSONAS, 8);

      expect(podcast).toBeDefined();
      expect(podcast.title).toContain("Week 8");
      expect(podcast.leagueName).toBe("Sunday Champions");
      expect(podcast.segments.length).toBeGreaterThanOrEqual(6);
      expect(podcast.script.length).toBe(podcast.segments.length);

      // Verify all 3 personas appear in the script
      const speakers = new Set(podcast.segments.map((s) => s.speaker));
      expect(speakers.has("Analytical Guru")).toBe(true);
      expect(speakers.has("Comedian")).toBe(true);
      expect(speakers.has("Beat Reporter")).toBe(true);

      // Verify tone and avatar metadata
      expect(podcast.segments[0].avatar).toBeDefined();
      expect(podcast.segments[0].tone).toBeDefined();
    });
  });

  describe("aiAnalysisApi (Frontend client layer)", () => {
    it("creates client-side fallback podcast when offline or API fails", async () => {
      const podcast = await generatePodcastEpisode({
        leagueInfo: { name: "Gridiron Glory", currentWeek: 5 },
        matchups: [],
        week: 5,
      });

      expect(podcast).toBeDefined();
      expect(podcast.week).toBe(5);
      expect(podcast.leagueName).toBe("Gridiron Glory");
      expect(podcast.segments.length).toBeGreaterThan(0);
      expect(podcast.highlights.length).toBeGreaterThan(0);
    });

    it("evaluates trade proposals with multi-host commentary and verdicts", async () => {
      const result = await generateTradeAnalysis({
        teamA: {
          teamName: "Team A",
          giving: ["RB1 Bellcow"],
          receiving: ["WR1 Elite", "2025 1st Round Pick"],
        },
        teamB: {
          teamName: "Team B",
          giving: ["WR1 Elite", "2025 1st Round Pick"],
          receiving: ["RB1 Bellcow"],
        },
      });

      expect(result).toBeDefined();
      expect(result.verdict).toBeDefined();
      expect(result.gradeTeamA).toBeDefined();
      expect(result.gradeTeamB).toBeDefined();
      expect(result.hostVerdicts.length).toBe(3);
      expect(result.keyFactors.length).toBeGreaterThan(0);
    });

    it("generates team diagnostic health report and prescriptions", async () => {
      const diagnostic = await generateTeamDiagnostic({
        teamName: "Touchdown Titans",
        record: "8-2",
        pointsFor: 1280.4,
        pointsAgainst: 1040.2,
        rank: 1,
      });

      expect(diagnostic.teamName).toBe("Touchdown Titans");
      expect(diagnostic.grade).toBe("A+");
      expect(diagnostic.healthStatus).toBe("True Contender");
      expect(diagnostic.strengths.length).toBeGreaterThan(0);
      expect(diagnostic.weaknesses.length).toBeGreaterThan(0);
      expect(diagnostic.prescriptions.length).toBeGreaterThan(0);
      expect(diagnostic.guruTake).toBeDefined();
      expect(diagnostic.comedianTake).toBeDefined();
    });

    it("generates weekly recap summary with awards and bad beats", async () => {
      const recap = await generateWeeklyRecapSummary({
        week: 7,
        leagueName: "Dynasty Elite",
        matchups: [
          { team1: "Titans", score1: 155.0, team2: "Warriors", score2: 120.0 },
        ],
        highScorer: { name: "Titans", score: 155.0 },
        lowScorer: { name: "Underdogs", score: 72.0 },
      });

      expect(recap.week).toBe(7);
      expect(recap.awards.length).toBeGreaterThanOrEqual(2);
      expect(recap.hostDiscussion.length).toBeGreaterThan(0);
      expect(recap.badBeats.length).toBeGreaterThan(0);
    });

    it("generates editorial newsletter with masthead and power rankings", async () => {
      const newsletter = await generateNewsletterContent({
        leagueInfo: { name: "Legends League", currentWeek: 11 },
        week: 11,
        theme: "gazette",
      });

      expect(newsletter.title).toBeDefined();
      expect(newsletter.issue).toBe(11);
      expect(newsletter.leagueName).toBe("Legends League");
      expect(newsletter.commissionerNote).toBeDefined();
      expect(newsletter.sections.length).toBeGreaterThanOrEqual(3);
      expect(newsletter.topRankings.length).toBeGreaterThan(0);
      expect(newsletter.hotWaiverPicks.length).toBeGreaterThan(0);
    });
  });
});
