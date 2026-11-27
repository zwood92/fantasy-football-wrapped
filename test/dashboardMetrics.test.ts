import { describe, expect, test } from "vitest";
import { buildTeamDashboardModel } from "../src/lib/dashboardMetrics";
import type { TableDataType } from "../src/types/types";

const makeTeam = (overrides: Partial<TableDataType>): TableDataType => ({
  name: "Alpha Squad",
  username: "alpha",
  wins: 7,
  losses: 3,
  ties: 0,
  pointsFor: 1280.4,
  pointsAgainst: 1150.2,
  winsAgainstAll: 68,
  lossesAgainstAll: 22,
  winsWithMedian: 14,
  lossesWithMedian: 6,
  headToHeadWins: 7,
  headToHeadLosses: 3,
  headToHeadTies: 0,
  rating: 88.5,
  randomScheduleWins: 6.2,
  avatarImg: "/avatars/avatar1.svg",
  points: [122, 134, 118, 141],
  matchups: [2, 3, 2, 3, 2, 3],
  potentialPoints: 1390,
  managerEfficiency: 0.921,
  regularSeasonRank: 1,
  id: "u1",
  rosterId: 1,
  expectedWinsSTD: 1.1,
  recordByWeek: "WWLW",
  players: ["p1", "p2", "p3"],
  starters: [
    ["p1", "p2"],
    ["p1", "p2"],
    ["p1", "p2"],
    ["p1", "p3"],
  ],
  starterPoints: [
    [24, 18],
    [28, 15],
    [19, 12],
    [31, 4.2],
  ],
  benchPlayers: [["p3"], ["p3"], ["p3"], ["p2"]],
  benchPoints: [[10], [8], [14], [19.5]],
  ...overrides,
});

describe("buildTeamDashboardModel", () => {
  const teams: TableDataType[] = [
    makeTeam({ rosterId: 1, id: "u1", name: "Alpha Squad", wins: 3, losses: 1, pointsFor: 515 }),
    makeTeam({
      rosterId: 2,
      id: "u2",
      name: "Bravo Brawlers",
      wins: 2,
      losses: 2,
      pointsFor: 480,
      rating: 79,
      points: [110, 128, 125, 117],
      matchups: [1, 3, 1, 3, 1, 3],
    }),
    makeTeam({
      rosterId: 3,
      id: "u3",
      name: "Charlie Clowns",
      wins: 1,
      losses: 3,
      pointsFor: 430,
      rating: 68,
      points: [105, 112, 98, 145],
      matchups: [2, 1, 3, 1, 3, 1],
    }),
  ];

  test("computes hero stats, weekly review, bench swap insight, MVPs, next matchups, and 3-host radio spotlight", () => {
    const model = buildTeamDashboardModel({
      teams,
      selectedRosterId: 1,
      league: {
        name: "Test Championship League",
        season: "2026",
        seasonType: "Redraft",
        regularSeasonLength: 6,
        lastScoredWeek: 4,
        scoringType: 1,
        playoffTeams: 2,
        transactions: { u1: 18, u2: 9, u3: 4 },
      },
      playerMap: {
        p1: { name: "Bijan Robinson", position: "RB" },
        p2: { name: "Puka Nacua", position: "WR" },
        p3: { name: " waiver Dart", position: "WR" },
      },
      extraWaiverMoves: [
        {
          id: 1,
          user: { username: "alpha", name: "Alpha Squad" },
          adds: "Waiver Dart",
          week: 3,
          value: 10,
          position: "WR",
          player_id: "p3",
          bid: 22,
          status: "complete",
        },
      ],
    });

    expect(model).not.toBeNull();
    expect(model!.teamName).toBe("Alpha Squad");
    expect(model!.standing).toBe(1);
    expect(model!.weeklyReview).toHaveLength(4);
    expect(model!.latestMatchup?.week).toBe(4);
    expect(model!.latestMatchup?.result).toBe("L"); // 141 vs 145

    // In week 4, Alpha Squad lost by 4 pts (141 vs 145) while benching Puka Nacua (19.5) over p3 (4.2) -> +15.3 net gain flips result!
    expect(model!.lineupInsight.benchSwapCandidate?.wouldFlipResult).toBe(true);
    expect(model!.lineupInsight.benchSwapCandidate?.benchPlayer).toBe("Puka Nacua");

    expect(model!.mvps[0].name).toBe("Bijan Robinson");
    expect(model!.mvps[0].starts).toBe(4);

    expect(model!.playoffPath.nextMatchups.length).toBeGreaterThanOrEqual(1);
    expect(model!.rosterActivity.activityRank).toBe(1);
    expect(model!.rosterActivity.faabSpent).toBe(22);

    // 3-host radio spotlight tailored to Alpha Squad
    expect(model!.radioSpotlight.teaserLines).toHaveLength(3);
    expect(model!.radioSpotlight.teaserLines[2].text).toContain("Puka Nacua");
  });
});
