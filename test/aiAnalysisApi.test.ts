import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createClientFallbackPodcast,
  DEFAULT_PODCAST_PERSONAS,
  generateNewsletterContent,
  generatePodcastEpisode,
  generateTeamDiagnostic,
  generateTradeAnalysis,
  generateWeeklyRecapSummary,
  type PodcastEpisode,
  type TeamDiagnosticRequest,
  type TradeAnalysisRequest,
  type WeeklyRecapRequest,
} from "../src/api/aiAnalysisApi";

describe("aiAnalysisApi", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("DEFAULT_PODCAST_PERSONAS", () => {
    it("provides baseline descriptions for all 3 show hosts", () => {
      expect(DEFAULT_PODCAST_PERSONAS.guru).toContain("stat-obsessed");
      expect(DEFAULT_PODCAST_PERSONAS.comedian).toContain("ruthless");
      expect(DEFAULT_PODCAST_PERSONAS.reporter).toContain("insider");
    });
  });

  describe("generatePodcastEpisode", () => {
    it("returns API response when /api/podcast fetch is successful", async () => {
      const mockApiEpisode: PodcastEpisode = {
        title: "Week 6 AI Spectacular",
        week: 6,
        leagueName: "Dynasty Champions",
        summary: "An incredible week of fantasy football action.",
        highlights: ["Highlight 1", "Highlight 2"],
        segments: [
          { speaker: "Analytical Guru", text: "Big data win", tone: "analytical" },
          { speaker: "Comedian", text: "Total collapse", tone: "funny" },
        ],
        script: [
          { speaker: "Analytical Guru", text: "Big data win" },
          { speaker: "Comedian", text: "Total collapse" },
        ],
        generatedAt: "2026-08-14T00:00:00.000Z",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiEpisode,
      });

      const episode = await generatePodcastEpisode({
        leagueInfo: { name: "Dynasty Champions", currentWeek: 6 },
        week: 6,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/podcast",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(episode.title).toBe("Week 6 AI Spectacular");
      expect(episode.segments.length).toBe(2);
      expect(episode.isMock).toBeFalsy();
    });

    it("falls back cleanly to client-side generator when API fetch fails or is offline", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection error"));

      const episode = await generatePodcastEpisode({
        leagueInfo: { name: "Offline League", currentWeek: 7 },
        week: 7,
      });

      expect(episode).toBeDefined();
      expect(episode.isMock).toBe(true);
      expect(episode.leagueName).toBe("Offline League");
      expect(episode.week).toBe(7);
      expect(episode.segments.length).toBeGreaterThanOrEqual(6);
    });

    it("merges custom personas with default personas properly", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const episode = await generatePodcastEpisode({
        leagueInfo: { name: "Custom League" },
        personas: { comedian: "A friendly, polite host who never roasts anyone." },
      });

      expect(episode.isMock).toBe(true);
      expect(episode.segments.some((s) => s.speaker === "Comedian")).toBe(true);
    });
  });

  describe("createClientFallbackPodcast", () => {
    it("extracts top scorer, low scorer, and close matchup from provided matchupsData", () => {
      const matchups = [
        {
          team1: { name: "Alpha Dogs" },
          score1: 165.4,
          team2: { name: "Beta Cats" },
          score2: 82.1,
        },
        {
          team1: "Close Team 1",
          score1: 121.2,
          team2: "Close Team 2",
          score2: 120.4,
        },
      ];

      const podcast = createClientFallbackPodcast({ name: "Premier League" }, matchups, {}, 9);

      expect(podcast.week).toBe(9);
      expect(podcast.leagueName).toBe("Premier League");
      expect(podcast.highlights.some((h) => h.includes("Alpha Dogs") && h.includes("165.4"))).toBe(true);
      expect(podcast.highlights.some((h) => h.includes("Beta Cats") && h.includes("82.1"))).toBe(true);
      expect(podcast.segments.length).toBe(6);
      expect(podcast.script.length).toBe(6);

      const speakers = podcast.segments.map((s) => s.speaker);
      expect(speakers).toContain("Analytical Guru");
      expect(speakers).toContain("Comedian");
      expect(speakers).toContain("Beat Reporter");
    });

    it("uses default teams when matchupsData is empty or missing", () => {
      const podcast = createClientFallbackPodcast();
      expect(podcast.leagueName).toBe("The League");
      expect(podcast.week).toBe(10);
      expect(podcast.segments.length).toBe(6);
    });
  });

  describe("generateTradeAnalysis", () => {
    it("evaluates a trade proposal and returns grades, host verdicts, and key factors", async () => {
      const request: TradeAnalysisRequest = {
        leagueName: "Dynasty Hub",
        format: "PPR",
        teamA: {
          teamName: "Team Alpha",
          giving: ["Christian McCaffrey"],
          receiving: ["Amon-Ra St. Brown", "2026 1st Round Pick"],
        },
        teamB: {
          teamName: "Team Beta",
          giving: ["Amon-Ra St. Brown", "2026 1st Round Pick"],
          receiving: ["Christian McCaffrey"],
        },
      };

      const result = await generateTradeAnalysis(request);

      expect(result.summary).toContain("Team Alpha");
      expect(result.summary).toContain("Team Beta");
      expect(["Fair & Balanced", "Clear Winner", "Massive Heist", "High Risk / High Reward", "Blockbuster Rebuild"]).toContain(
        result.verdict
      );
      expect(result.gradeTeamA).toBeTruthy();
      expect(result.gradeTeamB).toBeTruthy();
      expect(result.scoreA).toBeGreaterThanOrEqual(65);
      expect(result.scoreB).toBeGreaterThanOrEqual(65);
      expect(result.hostVerdicts.length).toBe(3);

      const hosts = result.hostVerdicts.map((h) => h.host);
      expect(hosts).toContain("Analytical Guru");
      expect(hosts).toContain("The Comedian");
      expect(hosts).toContain("Beat Reporter");
      expect(result.keyFactors.length).toBeGreaterThan(0);
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it("uses default player names when giving or receiving arrays are empty", async () => {
      const request: TradeAnalysisRequest = {
        teamA: { teamName: "T1", giving: [], receiving: [] },
        teamB: { teamName: "T2", giving: [], receiving: [] },
      };

      const result = await generateTradeAnalysis(request);
      expect(result.summary).toContain("Star RB1");
      expect(result.summary).toContain("Elite WR1");
    });
  });

  describe("generateTeamDiagnostic", () => {
    it("identifies 'The Unstoppable Juggernaut' for high win rate and high points", async () => {
      const req: TeamDiagnosticRequest = {
        teamName: "Powerhouse",
        record: "9-1",
        rank: 1,
        pointsFor: 1350,
        pointsAgainst: 1000,
      };

      const diag = await generateTeamDiagnostic(req);
      expect(diag.grade).toBe("A+");
      expect(diag.archetype).toBe("The Unstoppable Juggernaut");
      expect(diag.healthStatus).toBe("True Contender");
      expect(diag.luckRating).toBe(2.4);
      expect(diag.strengths.length).toBe(3);
      expect(diag.weaknesses.length).toBe(3);
      expect(diag.prescriptions.length).toBe(3);
    });

    it("identifies 'The Lucky Fraud' for high win rate but low points", async () => {
      const req: TeamDiagnosticRequest = {
        teamName: "Lucky Charms",
        record: "7-3",
        rank: 2,
        pointsFor: 980,
        pointsAgainst: 900,
      };

      const diag = await generateTeamDiagnostic(req);
      expect(diag.grade).toBe("B-");
      expect(diag.archetype).toBe("The Lucky Fraud");
      expect(diag.healthStatus).toBe("Dangerous Fraud");
      expect(diag.luckRating).toBe(8.1);
      expect(diag.comedianTake).toContain("fairy dust");
    });

    it("identifies 'The Unlucky Powerhouse' for low win rate but high points", async () => {
      const req: TeamDiagnosticRequest = {
        teamName: "Hard Luck Squad",
        record: "3-7",
        rank: 9,
        pointsFor: 1250,
        pointsAgainst: 1400,
      };

      const diag = await generateTeamDiagnostic(req);
      expect(diag.grade).toBe("B+");
      expect(diag.archetype).toBe("The Unlucky Powerhouse");
      expect(diag.healthStatus).toBe("Unlucky Powerhouse");
      expect(diag.luckRating).toBe(-7.6);
    });

    it("identifies 'The Sacko Frontrunner' for very low win rates", async () => {
      const req: TeamDiagnosticRequest = {
        teamName: "Basement Dweller",
        record: "2-8",
        rank: 12,
        pointsFor: 850,
        pointsAgainst: 1200,
      };

      const diag = await generateTeamDiagnostic(req);
      expect(diag.grade).toBe("F");
      expect(diag.archetype).toBe("The Sacko Frontrunner");
      expect(diag.healthStatus).toBe("Rebuilding / Sacko Watch");
    });

    it("identifies 'The Playoff Bubble Scrapper' as default balanced archetype", async () => {
      const req: TeamDiagnosticRequest = {
        teamName: "Middle of Pack",
        record: "5-5",
        rank: 6,
        pointsFor: 1100,
        pointsAgainst: 1100,
      };

      const diag = await generateTeamDiagnostic(req);
      expect(diag.grade).toBe("B");
      expect(diag.archetype).toBe("The Playoff Bubble Scrapper");
      expect(diag.healthStatus).toBe("Waiver Alchemist");
    });
  });

  describe("generateWeeklyRecapSummary", () => {
    it("generates hero, clown, and heartbreak awards with host recaps", async () => {
      const req: WeeklyRecapRequest = {
        week: 8,
        leagueName: "Elite League",
        matchups: [
          { team1: "Titans", score1: 155.2, team2: "Spartans", score2: 153.1 },
          { team1: "Warriors", score1: 120.0, team2: "Peanuts", score2: 74.5 },
        ],
        highScorer: { name: "Titans", score: 155.2 },
        lowScorer: { name: "Peanuts", score: 74.5 },
      };

      const recap = await generateWeeklyRecapSummary(req);

      expect(recap.week).toBe(8);
      expect(recap.leagueName).toBe("Elite League");
      expect(recap.awards.length).toBe(3);

      const hero = recap.awards.find((a) => a.category === "hero");
      const clown = recap.awards.find((a) => a.category === "clown");
      const heartbreak = recap.awards.find((a) => a.category === "heartbreak");

      expect(hero?.recipient).toBe("Titans");
      expect(clown?.recipient).toBe("Peanuts");
      expect(heartbreak?.recipient).toBe("Spartans");

      expect(recap.hostDiscussion.length).toBe(3);
      expect(recap.topStorylines.length).toBe(3);
      expect(recap.powerMoves.length).toBe(2);
      expect(recap.badBeats.length).toBe(2);
    });

    it("uses default high and low scorers if omitted", async () => {
      const req: WeeklyRecapRequest = {
        week: 5,
        leagueName: "Sunday Crew",
        matchups: [],
      };

      const recap = await generateWeeklyRecapSummary(req);
      expect(recap.awards[0].recipient).toBe("Redzone Renegades");
      expect(recap.awards[1].recipient).toBe("Bench Warmers");
    });
  });

  describe("generateNewsletterContent", () => {
    it("generates newsletter with theme-specific headlines and sections", async () => {
      const themes = ["roast", "playoffs", "dynasty", "gazette"] as const;

      for (const theme of themes) {
        const article = await generateNewsletterContent({
          leagueInfo: { name: "Gridiron Association", currentWeek: 11 },
          week: 11,
          theme,
        });

        expect(article.id).toContain("newsletter-w11");
        expect(article.issue).toBe(11);
        expect(article.leagueName).toBe("Gridiron Association");
        expect(article.title).toBeTruthy();
        expect(article.commissionerNote).toContain("Gridiron Association");
        expect(article.sections.length).toBe(3);
        expect(article.topRankings.length).toBe(4);
        expect(article.hotWaiverPicks.length).toBe(3);
      }
    });

    it("defaults to gazette theme and current season week when parameters are omitted", async () => {
      const article = await generateNewsletterContent({});
      expect(article.leagueName).toBe("The League");
      expect(article.issue).toBe(10);
      expect(article.title).toContain("The Gridiron Gazette");
    });
  });
});
