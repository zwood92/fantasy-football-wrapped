import { afterEach, describe, expect, test, vi } from "vitest";
import * as playerApiModule from "../src/api/playerApi.ts";
import * as sleeperApiModule from "../src/api/sleeperApi.ts";
import * as tradeValuesApiModule from "../src/api/tradeValuesApi.ts";
import {
  generateCalculatedLeaguePlayerValues,
  loadLeaguePlayerValues,
} from "../src/lib/leagueTradeValues.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("leagueTradeValues local calculation & fallback", () => {
  test("generates full player values locally when backend fails", async () => {
    vi.spyOn(tradeValuesApiModule, "getPlayerValues").mockRejectedValue(
      new Error("Network Error")
    );

    const playerMap = new Map([
      [
        "p1",
        {
          player_id: "p1",
          name: "Josh Allen",
          position: "QB",
          team: "BUF",
        },
      ],
      [
        "p2",
        {
          player_id: "p2",
          name: "Justin Jefferson",
          position: "WR",
          team: "MIN",
        },
      ],
      [
        "p3",
        {
          player_id: "p3",
          name: "Bijan Robinson",
          position: "RB",
          team: "ATL",
        },
      ],
    ]);

    vi.spyOn(playerApiModule, "getPlayersByIdsMap").mockResolvedValue(playerMap);
    vi.spyOn(sleeperApiModule, "getStats").mockImplementation(async (playerId) => {
      if (playerId === "p1") return { points: 380, rank: 1, overallRank: 5 };
      if (playerId === "p2") return { points: 300, rank: 1, overallRank: 2 };
      return { points: 290, rank: 1, overallRank: 3 };
    });

    const result = await loadLeaguePlayerValues({
      league: {
        leagueId: "league-1",
        season: "2026",
        status: "in_season",
        scoringType: 1,
        scoringSettings: { rec: 1 },
        rosterPositions: ["QB", "RB", "WR", "TE", "FLEX", "BN"],
        totalRosters: 2,
        seasonType: "Redraft",
        platform: "sleeper",
      },
      tableData: [
        {
          rosterId: 1,
          name: "Manager 1",
          username: "user1",
          starters: [["p1", "p2"]],
          benchPlayers: [[]],
          players: ["p1", "p2"],
        },
        {
          rosterId: 2,
          name: "Manager 2",
          username: "user2",
          starters: [["p3"]],
          benchPlayers: [[]],
          players: ["p3"],
        },
      ],
      selectedWeek: 1,
      showUsernames: false,
      dynastyPerspective: "balanced",
    });

    expect(result.rankings.length).toBe(3);
    expect(result.access).toBe("premium");
    expect(result.totalPlayers).toBe(3);
    expect(result.rankings[0].tradeValue).toBeGreaterThan(0);
    expect(result.rosters).toHaveLength(2);
  });

  test("computes dynasty rankings with ADP and age curves locally", async () => {
    const playerMap = new Map([
      [
        "p1",
        {
          player_id: "p1",
          name: "Caleb Williams",
          position: "QB",
          team: "CHI",
        },
      ],
      [
        "p2",
        {
          player_id: "p2",
          name: "Marvin Harrison Jr.",
          position: "WR",
          team: "ARI",
        },
      ],
    ]);

    vi.spyOn(playerApiModule, "getPlayersByIdsMap").mockResolvedValue(playerMap);
    vi.spyOn(sleeperApiModule, "getDraftProjections").mockImplementation(
      async (playerId) => {
        if (playerId === "p1") return { adp: 18 };
        return { adp: 12 };
      }
    );

    const result = await generateCalculatedLeaguePlayerValues({
      league: {
        leagueId: "dynasty-1",
        season: "2026",
        status: "in_season",
        scoringType: 1,
        scoringSettings: { rec: 1 },
        rosterPositions: ["QB", "SUPER_FLEX", "RB", "WR", "BN"],
        totalRosters: 2,
        seasonType: "Dynasty",
        platform: "sleeper",
      },
      tableData: [
        {
          rosterId: 1,
          name: "Dynasty Team 1",
          starters: [["p1"]],
          benchPlayers: [[]],
          players: ["p1"],
        },
        {
          rosterId: 2,
          name: "Dynasty Team 2",
          starters: [["p2"]],
          benchPlayers: [[]],
          players: ["p2"],
        },
      ],
      selectedWeek: 1,
      showUsernames: false,
      dynastyPerspective: "balanced",
    });

    expect(result.rankings).toHaveLength(2);
    expect(result.rankings[0].tradeValue).toBeGreaterThan(0);
    expect(result.rankings[0].dynastyAdp).toBeTruthy();
  });
});
