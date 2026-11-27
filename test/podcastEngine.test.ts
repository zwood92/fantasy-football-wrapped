import { describe, expect, test } from "vitest";
import {
  extractWeeklyPodcastFacts,
  generateStudioPodcastEpisode,
  PODCAST_SHOW_PRESETS,
} from "../src/lib/podcastEngine";
import { WaiverStatus, WaiverType } from "../src/types/apiTypes";

describe("podcastEngine — 3-host personalities & 8-10m real-league script", () => {
  const sampleLeague = {
    name: "Degenerate Dynasty",
    season: "2026",
    seasonType: "Dynasty",
    totalRosters: 4,
    playoffTeams: 2,
    regularSeasonLength: 14,
    lastScoredWeek: 6,
    currentWeek: 6,
    scoringType: 1,
    users: [
      { id: "u1", name: "Mahomes Magic", username: "zach", avatar: "" },
      { id: "u2", name: "Sacko Taco", username: "taco", avatar: "" },
      { id: "u3", name: "Waiver Sharks", username: "shark", avatar: "" },
      { id: "u4", name: "Gridiron Kings", username: "king", avatar: "" },
    ],
    rosters: [
      {
        id: "u1",
        rosterId: 1,
        wins: 5,
        losses: 1,
        ties: 0,
        pointsFor: 840,
        pointsAgainst: 680,
        potentialPoints: 890,
        managerEfficiency: 0.94,
        recordByWeek: "WWWWLW",
      },
      {
        id: "u2",
        rosterId: 2,
        wins: 1,
        losses: 5,
        ties: 0,
        pointsFor: 590,
        pointsAgainst: 790,
        potentialPoints: 710,
        managerEfficiency: 0.83,
        recordByWeek: "WLLLLL",
      },
      {
        id: "u3",
        rosterId: 3,
        wins: 3,
        losses: 3,
        ties: 0,
        pointsFor: 725,
        pointsAgainst: 720,
        potentialPoints: 780,
        managerEfficiency: 0.93,
        recordByWeek: "LWLWLW",
      },
      {
        id: "u4",
        rosterId: 4,
        wins: 3,
        losses: 3,
        ties: 0,
        pointsFor: 722,
        pointsAgainst: 725,
        potentialPoints: 790,
        managerEfficiency: 0.91,
        recordByWeek: "WLWLWL",
      },
    ],
    weeklyPoints: [
      {
        rosterId: 1,
        points: [130, 140, 135, 150, 120, 165.4],
        matchups: [1, 2, 1, 2, 1, 1],
        starters: [[], [], [], [], [], ["p_chase", "p_allen"]],
        starterPoints: [[], [], [], [], [], [38.4, 29.0]],
        benchPlayers: [[], [], [], [], [], ["p_bench1"]],
        benchPoints: [[], [], [], [], [], [8.2]],
      },
      {
        rosterId: 2,
        points: [110, 95, 88, 102, 99, 84.2],
        matchups: [1, 1, 2, 1, 2, 1],
        starters: [[], [], [], [], [], ["p_pitts", "p_rb2"]],
        starterPoints: [[], [], [], [], [], [1.9, 9.5]],
        benchPlayers: [[], [], [], [], [], ["p_warren"]],
        benchPoints: [[], [], [], [], [], [24.6]],
      },
      {
        rosterId: 3,
        points: [118, 122, 119, 121, 120, 125.8],
        matchups: [2, 2, 1, 1, 2, 2],
        starters: [[], [], [], [], [], ["p_pickup", "p_wr1"]],
        starterPoints: [[], [], [], [], [], [21.5, 19.3]],
        benchPlayers: [[], [], [], [], [], ["p_b3"]],
        benchPoints: [[], [], [], [], [], [6.0]],
      },
      {
        rosterId: 4,
        points: [120, 115, 125, 118, 119, 124.1],
        matchups: [2, 1, 2, 2, 1, 2],
        starters: [[], [], [], [], [], ["p_dud", "p_qb"]],
        starterPoints: [[], [], [], [], [], [3.1, 24.0]],
        benchPlayers: [[], [], [], [], [], ["p_boom_bench"]],
        benchPoints: [[], [], [], [], [], [19.8]],
      },
    ],
    waivers: [
      {
        status: WaiverStatus.Complete,
        type: WaiverType.Waiver,
        metadata: null,
        created: 1,
        settings: { seq: 1, waiver_bid: 32 },
        leg: 6,
        draft_picks: [],
        creator: "u3",
        transaction_id: "tx-1",
        adds: { p_pickup: 3 },
        drops: { p_drop: 3 },
        consenter_ids: [3],
        roster_ids: [3],
        status_updated: 1,
        waiver_budget: [],
      },
    ],
    trades: [
      {
        status: WaiverStatus.Complete,
        type: WaiverType.Trade,
        metadata: null,
        created: 1,
        settings: null,
        leg: 6,
        draft_picks: [],
        creator: "u1",
        transaction_id: "tx-trade-1",
        adds: { p_chase: 1, p_wr1: 3 },
        drops: null,
        consenter_ids: [1, 3],
        roster_ids: [1, 3],
        status_updated: 1,
        waiver_budget: [],
      },
    ],
    transactions: { u1: 12, u2: 3, u3: 29, u4: 14 },
  };

  const playerMap = {
    p_chase: { name: "Ja'Marr Chase", position: "WR" },
    p_pitts: { name: "Kyle Pitts", position: "TE" },
    p_warren: { name: "Jaylen Warren", position: "RB" },
    p_pickup: { name: "Tyrone Tracy", position: "RB" },
    p_dud: { name: "Gabe Davis", position: "WR" },
    p_boom_bench: { name: "Tank Dell", position: "WR" },
    p_wr1: { name: "DeVonta Smith", position: "WR" },
  };

  test("extracts real matchups, bench blunders, FAAB waivers, and trades for target week", () => {
    const facts = extractWeeklyPodcastFacts({
      leagueInfo: sampleLeague as any,
      week: 6,
      playerMap,
    });

    expect(facts.matchups).toHaveLength(2);
    expect(facts.highScorer.name).toBe("Mahomes Magic");
    expect(facts.highScorer.score).toBe(165.4);
    expect(facts.lowScorer.name).toBe("Sacko Taco");
    expect(facts.lowScorer.score).toBe(84.2);

    // Gridiron Kings lost by 1.7 pts (124.1 vs 125.8) while benching Tank Dell (19.8) over Gabe Davis (3.1) -> cost win!
    expect(facts.biggestBenchBlunder?.manager).toBe("Gridiron Kings");
    expect(facts.biggestBenchBlunder?.costMatchup).toBe(true);
    expect(facts.biggestBenchBlunder?.benchPlayer).toContain("Tank Dell");

    expect(facts.waivers).toHaveLength(1);
    expect(facts.waivers[0].manager).toBe("Waiver Sharks");
    expect(facts.waivers[0].bid).toBe(32);
    expect(facts.waivers[0].addedPlayer).toContain("Tyrone Tracy");
    expect(facts.waivers[0].startedInWeek).toBe(true);
    expect(facts.waivers[0].pointsScored).toBe(21.5);

    expect(facts.trades).toHaveLength(1);
    expect(facts.trades[0].summary).toContain("Mahomes Magic");
    expect(facts.trades[0].summary).toContain("Waiver Sharks");
  });

  test("generates an 8-10 minute 6-act comedy script referencing real teams, players, waivers, and trades", () => {
    const episode = generateStudioPodcastEpisode({
      leagueInfo: sampleLeague as any,
      personas: PODCAST_SHOW_PRESETS[1].personas,
      week: 6,
      playerMap,
      isMock: true,
    });

    expect(episode.acts).toHaveLength(6);
    expect(episode.wordCount).toBeGreaterThanOrEqual(1150);
    expect(episode.estimatedDurationMinutes).toBeGreaterThanOrEqual(7.8);
    expect(episode.estimatedDurationMinutes).toBeLessThanOrEqual(12.5);

    const fullText = episode.segments.map((s) => s.text).join(" ");
    expect(fullText).toContain("Mahomes Magic");
    expect(fullText).toContain("Sacko Taco");
    expect(fullText).toContain("Waiver Sharks");
    expect(fullText).toContain("Gridiron Kings");
    expect(fullText).toContain("Tyrone Tracy");
    expect(fullText).toContain("$32");
    expect(fullText).toContain("Tank Dell");
  });
});
