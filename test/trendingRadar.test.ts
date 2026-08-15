import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOwnershipMap,
  fetchTrendingRadarPlayers,
  filterTrendingRadarList,
  formatTrendingCount,
  getMockTrendingRadarData,
  getPlayerHeadshotUrl,
  type TrendingPlayerItem,
} from "../src/lib/trendingRadar";
import { getTrendingPlayers } from "../src/api/sleeperApi";
import type { LeagueInfoType, TableDataType } from "../src/types/types";

describe("trendingRadar", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("getTrendingPlayers API", () => {
    it("fetches trending adds from Sleeper API endpoint with parameters", async () => {
      const mockResponse = [
        { player_id: "8131", count: 45000 },
        { player_id: "11575", count: 32000 },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await getTrendingPlayers("add", 24, 25);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=25",
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ player_id: "8131", count: 45000 });
      expect(result[1]).toEqual({ player_id: "11575", count: 32000 });
    });

    it("fetches trending drops from Sleeper API", async () => {
      const mockResponse = [{ player_id: "9223", count: 18000 }];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await getTrendingPlayers("drop", 48, 10);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=48&limit=10",
        expect.any(Object)
      );
      expect(result).toEqual([{ player_id: "9223", count: 18000 }]);
    });

    it("returns empty array on API failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection lost"));
      const result = await getTrendingPlayers("add", 24, 25);
      expect(result).toEqual([]);
    });
  });

  describe("formatTrendingCount", () => {
    it("formats counts under 1,000 as numbers with locale string", () => {
      expect(formatTrendingCount(450)).toBe("450");
      expect(formatTrendingCount(0)).toBe("0");
    });

    it("formats counts in thousands with k abbreviation", () => {
      expect(formatTrendingCount(1500)).toBe("1.5k");
      expect(formatTrendingCount(24000)).toBe("24k");
      expect(formatTrendingCount(48500)).toBe("49k");
    });

    it("formats counts in millions with M abbreviation", () => {
      expect(formatTrendingCount(1200000)).toBe("1.2M");
    });
  });

  describe("getPlayerHeadshotUrl", () => {
    it("returns team logo for defenses", () => {
      expect(getPlayerHeadshotUrl("BAL", "DEF")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/bal.png"
      );
      expect(getPlayerHeadshotUrl("SF")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/sf.png"
      );
    });

    it("returns player thumb for offensive/kicking players", () => {
      expect(getPlayerHeadshotUrl("8131", "TE")).toBe(
        "https://sleepercdn.com/content/nfl/players/thumb/8131.jpg"
      );
    });
  });

  describe("buildOwnershipMap", () => {
    it("builds ownership mapping from tableData rosters", () => {
      const mockTableData: Partial<TableDataType>[] = [
        {
          rosterId: 1,
          name: "Team Alpha",
          username: "alpha_mgr",
          avatarImg: "https://example.com/a.png",
          players: ["8131", "11575"],
        },
        {
          rosterId: 2,
          name: "Team Beta",
          username: "beta_mgr",
          avatarImg: "https://example.com/b.png",
          players: ["9223"],
        },
      ];

      const map = buildOwnershipMap(mockTableData as TableDataType[]);
      expect(map.size).toBe(3);
      expect(map.get("8131")).toEqual({
        rosterId: 1,
        managerName: "Team Alpha",
        managerUsername: "alpha_mgr",
        managerAvatar: "https://example.com/a.png",
      });
      expect(map.get("9223")).toEqual({
        rosterId: 2,
        managerName: "Team Beta",
        managerUsername: "beta_mgr",
        managerAvatar: "https://example.com/b.png",
      });
      expect(map.get("99999")).toBeUndefined();
    });

    it("builds ownership mapping from league rosters and users if tableData is missing", () => {
      const mockLeague: Partial<LeagueInfoType> = {
        rosters: [
          {
            id: "user-1",
            rosterId: 1,
            players: ["8131"],
            pointsFor: 0,
            pointsAgainst: 0,
            potentialPoints: 0,
            managerEfficiency: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            recordByWeek: "",
          },
        ],
        users: [
          {
            id: "user-1",
            name: "Alpha User",
            username: "alpha123",
            avatar: "avatar1",
            avatarImg: "https://example.com/avatar1.jpg",
          },
        ],
      };

      const map = buildOwnershipMap([], mockLeague as LeagueInfoType);
      expect(map.size).toBe(1);
      expect(map.get("8131")).toEqual({
        rosterId: 1,
        managerName: "Alpha User",
        managerUsername: "alpha123",
        managerAvatar: "https://example.com/avatar1.jpg",
      });
    });
  });

  describe("getMockTrendingRadarData", () => {
    it("returns mock trending adds with realistic counts and availability", () => {
      const data = getMockTrendingRadarData("add", 24);
      expect(data.length).toBeGreaterThan(5);
      expect(data[0].type).toBe("add");
      expect(data[0].count).toBeGreaterThan(10000);
      expect(data[0].isAvailable).toBe(true);
    });

    it("returns mock trending drops when requested", () => {
      const data = getMockTrendingRadarData("drop", 48);
      expect(data.length).toBeGreaterThan(5);
      expect(data[0].type).toBe("drop");
      expect(data[0].count).toBeGreaterThan(10000);
    });

    it("cross-references ownership map in mock data", () => {
      const ownershipMap = new Map([
        [
          "8131",
          {
            rosterId: 4,
            managerName: "Roster 4",
            managerUsername: "user4",
          },
        ],
      ]);

      const data = getMockTrendingRadarData("add", 24, ownershipMap);
      const likely = data.find((p) => p.playerId === "8131");
      expect(likely).toBeDefined();
      expect(likely?.isAvailable).toBe(false);
      expect(likely?.status).toBe("rostered");
      expect(likely?.rosterId).toBe(4);
      expect(likely?.managerName).toBe("Roster 4");
    });
  });

  describe("fetchTrendingRadarPlayers", () => {
    it("fetches, hydratres, and marks roster status accurately", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("trending/add")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [
              { player_id: "8131", count: 48000 },
              { player_id: "11575", count: 35000 },
            ],
          });
        }
        if (url.includes("getPlayer")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              players: [
                {
                  player_id: "8131",
                  name: "Isaiah Likely",
                  position: "TE",
                  team: "BAL",
                },
                {
                  player_id: "11575",
                  name: "Ray Davis",
                  position: "RB",
                  team: "BUF",
                },
              ],
            }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      const mockTableData: Partial<TableDataType>[] = [
        {
          rosterId: 3,
          name: "Team McBride",
          username: "mcbride",
          players: ["8131"],
        },
      ];

      const result = await fetchTrendingRadarPlayers({
        type: "add",
        lookbackHours: 24,
        tableData: mockTableData as TableDataType[],
      });

      expect(result).toHaveLength(2);

      const likely = result.find((p) => p.playerId === "8131");
      expect(likely).toBeDefined();
      expect(likely?.name).toBe("Isaiah Likely");
      expect(likely?.position).toBe("TE");
      expect(likely?.team).toBe("BAL");
      expect(likely?.isAvailable).toBe(false);
      expect(likely?.status).toBe("rostered");
      expect(likely?.managerName).toBe("Team McBride");

      const davis = result.find((p) => p.playerId === "11575");
      expect(davis).toBeDefined();
      expect(davis?.name).toBe("Ray Davis");
      expect(davis?.isAvailable).toBe(true);
      expect(davis?.status).toBe("available");
    });
  });

  describe("filterTrendingRadarList", () => {
    const mockPlayers: TrendingPlayerItem[] = [
      {
        playerId: "1",
        name: "Lamar Jackson",
        team: "BAL",
        position: "QB",
        count: 5000,
        type: "add",
        status: "rostered",
        isAvailable: false,
        managerName: "Manager A",
        headshotUrl: "",
      },
      {
        playerId: "2",
        name: "Ray Davis",
        team: "BUF",
        position: "RB",
        count: 4000,
        type: "add",
        status: "available",
        isAvailable: true,
        headshotUrl: "",
      },
      {
        playerId: "3",
        name: "Isaiah Likely",
        team: "BAL",
        position: "TE",
        count: 3500,
        type: "add",
        status: "available",
        isAvailable: true,
        headshotUrl: "",
      },
      {
        playerId: "4",
        name: "Justin Tucker",
        team: "BAL",
        position: "K",
        count: 3000,
        type: "drop",
        status: "rostered",
        isAvailable: false,
        managerName: "Manager B",
        headshotUrl: "",
      },
    ];

    it("filters by position correctly", () => {
      const qbs = filterTrendingRadarList(mockPlayers, { position: "QB" });
      expect(qbs).toHaveLength(1);
      expect(qbs[0].name).toBe("Lamar Jackson");

      const rbs = filterTrendingRadarList(mockPlayers, { position: "RB" });
      expect(rbs).toHaveLength(1);
      expect(rbs[0].name).toBe("Ray Davis");
    });

    it("filters by FLEX correctly (RB, WR, TE)", () => {
      const flex = filterTrendingRadarList(mockPlayers, { position: "FLEX" });
      expect(flex).toHaveLength(2);
      expect(flex.map((p) => p.name)).toEqual(["Ray Davis", "Isaiah Likely"]);
    });

    it("filters by availability only", () => {
      const availableOnly = filterTrendingRadarList(mockPlayers, {
        availableOnly: true,
      });
      expect(availableOnly).toHaveLength(2);
      expect(availableOnly.every((p) => p.isAvailable)).toBe(true);
    });

    it("filters by search query matching player name, team, or manager", () => {
      const searchPlayer = filterTrendingRadarList(mockPlayers, {
        searchQuery: "likely",
      });
      expect(searchPlayer).toHaveLength(1);
      expect(searchPlayer[0].name).toBe("Isaiah Likely");

      const searchTeam = filterTrendingRadarList(mockPlayers, {
        searchQuery: "BUF",
      });
      expect(searchTeam).toHaveLength(1);
      expect(searchTeam[0].name).toBe("Ray Davis");

      const searchManager = filterTrendingRadarList(mockPlayers, {
        searchQuery: "Manager A",
      });
      expect(searchManager).toHaveLength(1);
      expect(searchManager[0].name).toBe("Lamar Jackson");
    });
  });
});
