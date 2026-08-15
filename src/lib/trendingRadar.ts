import type { Player } from "@/types/apiTypes";
import type { LeagueInfoType, TableDataType } from "@/types/types";
import { getTrendingPlayers, type SleeperTrendingPlayer } from "@/api/sleeperApi";
import { getPlayersByIdsMap } from "@/api/playerApi";

export type TrendingActionType = "add" | "drop";
export type TrendingTimeWindow = 24 | 48 | 168;
export type PlayerOwnershipStatus = "available" | "rostered";
export type PlayerPositionFilter =
  | "ALL"
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "K"
  | "DEF"
  | "FLEX";

export interface TrendingPlayerItem {
  playerId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  team: string;
  position: string;
  count: number;
  type: TrendingActionType;
  status: PlayerOwnershipStatus;
  isAvailable: boolean;
  rosterId?: number;
  managerName?: string;
  managerUsername?: string;
  managerAvatar?: string;
  headshotUrl: string;
  rank?: number;
  ppg?: number;
}

export interface TrendingRadarOptions {
  type?: TrendingActionType;
  lookbackHours?: TrendingTimeWindow | number;
  limit?: number;
  tableData?: TableDataType[];
  league?: LeagueInfoType | null;
  position?: PlayerPositionFilter | string;
  availableOnly?: boolean;
  signal?: AbortSignal;
  forceDemo?: boolean;
}

export interface ManagerOwnershipInfo {
  rosterId: number;
  managerName: string;
  managerUsername: string;
  managerAvatar?: string;
}

export const NFL_DEFENSES = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
  "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"
]);

const KNOWN_DEFENSE_NAMES: Record<string, string> = {
  ARI: "Cardinals",
  ATL: "Falcons",
  BAL: "Ravens",
  BUF: "Bills",
  CAR: "Panthers",
  CHI: "Bears",
  CIN: "Bengals",
  CLE: "Browns",
  DAL: "Cowboys",
  DEN: "Broncos",
  DET: "Lions",
  GB: "Packers",
  HOU: "Texans",
  IND: "Colts",
  JAX: "Jaguars",
  KC: "Chiefs",
  LV: "Raiders",
  LAC: "Chargers",
  LAR: "Rams",
  MIA: "Dolphins",
  MIN: "Vikings",
  NE: "Patriots",
  NO: "Saints",
  NYG: "Giants",
  NYJ: "Jets",
  PHI: "Eagles",
  PIT: "Steelers",
  SEA: "Seahawks",
  SF: "49ers",
  TB: "Buccaneers",
  TEN: "Titans",
  WAS: "Commanders",
};

export const getPlayerHeadshotUrl = (
  playerId: string,
  position?: string
): string => {
  if (!playerId) return "";
  const isDef =
    position === "DEF" || NFL_DEFENSES.has(playerId.toUpperCase());
  if (isDef) {
    return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
  }
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
};

export const formatTrendingCount = (count: number): string => {
  if (!Number.isFinite(count) || count === 0) return "0";
  const abs = Math.abs(count);
  if (abs >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    return `${Math.round(count / 1_000)}k`;
  }
  if (abs >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toLocaleString();
};

export const buildOwnershipMap = (
  tableData?: TableDataType[],
  league?: LeagueInfoType | null
): Map<string, ManagerOwnershipInfo> => {
  const ownershipMap = new Map<string, ManagerOwnershipInfo>();

  if (Array.isArray(tableData) && tableData.length > 0) {
    for (const team of tableData) {
      if (Array.isArray(team.players)) {
        for (const pid of team.players) {
          if (pid) {
            ownershipMap.set(String(pid), {
              rosterId: team.rosterId,
              managerName: team.name || `Roster ${team.rosterId}`,
              managerUsername: team.username || team.name || `Roster ${team.rosterId}`,
              managerAvatar: team.avatarImg,
            });
          }
        }
      }
    }
    return ownershipMap;
  }

  if (league?.rosters && Array.isArray(league.rosters)) {
    for (const roster of league.rosters) {
      const user = league.users?.find((u) => u.id === roster.id);
      const managerName = user?.name || `Roster ${roster.rosterId}`;
      const managerUsername = user?.username || managerName;
      const managerAvatar =
        user?.avatarImg ||
        (user?.avatar
          ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
          : undefined);

      if (Array.isArray(roster.players)) {
        for (const pid of roster.players) {
          if (pid) {
            ownershipMap.set(String(pid), {
              rosterId: roster.rosterId,
              managerName,
              managerUsername,
              managerAvatar,
            });
          }
        }
      }
    }
  }

  return ownershipMap;
};

interface MockPlayerSeed {
  playerId: string;
  name: string;
  position: string;
  team: string;
  baseAdds: number;
  baseDrops: number;
}

const MOCK_SEEDS: MockPlayerSeed[] = [
  { playerId: "8131", name: "Isaiah Likely", position: "TE", team: "BAL", baseAdds: 48500, baseDrops: 320 },
  { playerId: "11575", name: "Ray Davis", position: "RB", team: "BUF", baseAdds: 36200, baseDrops: 450 },
  { playerId: "8228", name: "Jordan Mason", position: "RB", team: "SF", baseAdds: 34100, baseDrops: 180 },
  { playerId: "11634", name: "Tyrone Tracy Jr.", position: "RB", team: "NYG", baseAdds: 29800, baseDrops: 210 },
  { playerId: "11628", name: "Bucky Irving", position: "RB", team: "TB", baseAdds: 28400, baseDrops: 340 },
  { playerId: "11647", name: "Kimani Vidal", position: "RB", team: "LAC", baseAdds: 24700, baseDrops: 410 },
  { playerId: "11638", name: "Ricky Pearsall", position: "WR", team: "SF", baseAdds: 21900, baseDrops: 290 },
  { playerId: "11632", name: "Xavier Legette", position: "WR", team: "CAR", baseAdds: 19800, baseDrops: 530 },
  { playerId: "7042", name: "Jauan Jennings", position: "WR", team: "SF", baseAdds: 18500, baseDrops: 620 },
  { playerId: "9488", name: "Cedric Tillman", position: "WR", team: "CLE", baseAdds: 17300, baseDrops: 490 },
  { playerId: "9224", name: "Tucker Kraft", position: "TE", team: "GB", baseAdds: 16100, baseDrops: 380 },
  { playerId: "11631", name: "Bo Nix", position: "QB", team: "DEN", baseAdds: 15400, baseDrops: 740 },
  { playerId: "11633", name: "Drake Maye", position: "QB", team: "NE", baseAdds: 14200, baseDrops: 680 },
  { playerId: "11635", name: "Isaac Guerendo", position: "RB", team: "SF", baseAdds: 13800, baseDrops: 310 },
  { playerId: "9226", name: "Josh Downs", position: "WR", team: "IND", baseAdds: 12900, baseDrops: 820 },
  { playerId: "MIN", name: "Minnesota Vikings", position: "DEF", team: "MIN", baseAdds: 12500, baseDrops: 910 },
  { playerId: "DEN", name: "Denver Broncos", position: "DEF", team: "DEN", baseAdds: 11400, baseDrops: 1120 },
  { playerId: "1945", name: "Chris Boswell", position: "K", team: "PIT", baseAdds: 10800, baseDrops: 580 },
  { playerId: "8259", name: "Cameron Dicker", position: "K", team: "LAC", baseAdds: 9600, baseDrops: 470 },
  { playerId: "9498", name: "Parker Washington", position: "WR", team: "JAX", baseAdds: 8900, baseDrops: 610 },
  { playerId: "11637", name: "Theo Johnson", position: "TE", team: "NYG", baseAdds: 8200, baseDrops: 530 },
  { playerId: "7090", name: "Darnell Mooney", position: "WR", team: "ATL", baseAdds: 7900, baseDrops: 940 },
  { playerId: "9223", name: "Luke Musgrave", position: "TE", team: "GB", baseAdds: 420, baseDrops: 38400 },
  { playerId: "2216", name: "Brandin Cooks", position: "WR", team: "DAL", baseAdds: 310, baseDrops: 34100 },
  { playerId: "7564", name: "Elijah Moore", position: "WR", team: "CLE", baseAdds: 550, baseDrops: 29800 },
  { playerId: "6149", name: "Gardner Minshew", position: "QB", team: "LV", baseAdds: 610, baseDrops: 27500 },
  { playerId: "4199", name: "Jamaal Williams", position: "RB", team: "NO", baseAdds: 280, baseDrops: 24300 },
  { playerId: "3321", name: "Demarcus Robinson", position: "WR", team: "LAR", baseAdds: 720, baseDrops: 21900 },
  { playerId: "5086", name: "Allen Lazard", position: "WR", team: "NYJ", baseAdds: 410, baseDrops: 19600 },
  { playerId: "6790", name: "Antonio Gibson", position: "RB", team: "NE", baseAdds: 830, baseDrops: 18200 },
  { playerId: "8154", name: "Dameon Pierce", position: "RB", team: "HOU", baseAdds: 950, baseDrops: 16900 },
  { playerId: "7002", name: "Juwan Johnson", position: "TE", team: "NO", baseAdds: 1100, baseDrops: 15400 },
  { playerId: "9509", name: "Andrei Iosivas", position: "WR", team: "CIN", baseAdds: 1200, baseDrops: 14100 },
  { playerId: "4017", name: "Deshaun Watson", position: "QB", team: "CLE", baseAdds: 880, baseDrops: 13600 },
  { playerId: "5849", name: "Daniel Jones", position: "QB", team: "NYG", baseAdds: 1450, baseDrops: 12800 },
  { playerId: "DAL", name: "Dallas Cowboys", position: "DEF", team: "DAL", baseAdds: 1600, baseDrops: 11900 },
  { playerId: "1264", name: "Justin Tucker", position: "K", team: "BAL", baseAdds: 2100, baseDrops: 10400 },
];

export const getMockTrendingRadarData = (
  type: TrendingActionType,
  lookbackHours: number = 24,
  ownershipMap?: Map<string, ManagerOwnershipInfo>
): TrendingPlayerItem[] => {
  const multiplier = lookbackHours === 168 ? 4.2 : lookbackHours === 48 ? 1.8 : 1.0;
  const map = ownershipMap ?? new Map();

  const sortedSeeds = [...MOCK_SEEDS].sort((a, b) => {
    const aVal = type === "add" ? a.baseAdds : a.baseDrops;
    const bVal = type === "add" ? b.baseAdds : b.baseDrops;
    return bVal - aVal;
  });

  return sortedSeeds
    .filter((seed) => (type === "add" ? seed.baseAdds > 2000 : seed.baseDrops > 2000))
    .slice(0, 25)
    .map((seed) => {
      const rawCount = type === "add" ? seed.baseAdds : seed.baseDrops;
      const count = Math.round(rawCount * multiplier);
      const owner = map.get(seed.playerId);
      const isAvailable = !owner;

      return {
        playerId: seed.playerId,
        name: seed.name,
        team: seed.team,
        position: seed.position,
        count,
        type,
        status: isAvailable ? "available" : "rostered",
        isAvailable,
        rosterId: owner?.rosterId,
        managerName: owner?.managerName,
        managerUsername: owner?.managerUsername,
        managerAvatar: owner?.managerAvatar,
        headshotUrl: getPlayerHeadshotUrl(seed.playerId, seed.position),
      };
    });
};

const resolvePlayerMetadata = (
  playerId: string,
  rawPlayer?: Player
): {
  name: string;
  firstName?: string;
  lastName?: string;
  team: string;
  position: string;
} => {
  const upperId = playerId.toUpperCase();
  if (NFL_DEFENSES.has(upperId)) {
    const teamName = KNOWN_DEFENSE_NAMES[upperId] || upperId;
    return {
      name: `${upperId} ${teamName}`,
      team: upperId,
      position: "DEF",
    };
  }

  if (rawPlayer) {
    const rawAny = rawPlayer as unknown as Record<string, string | undefined>;
    const firstName = rawAny.first_name || rawPlayer.name?.split(" ")[0] || "";
    const lastName =
      rawAny.last_name ||
      rawPlayer.name?.split(" ").slice(1).join(" ") ||
      "";
    const name =
      rawPlayer.name ||
      (firstName && lastName ? `${firstName} ${lastName}` : playerId);

    return {
      name,
      firstName,
      lastName,
      team: rawPlayer.team || "",
      position: rawPlayer.position || "FLX",
    };
  }

  const mockMatch = MOCK_SEEDS.find((s) => s.playerId === playerId);
  if (mockMatch) {
    return {
      name: mockMatch.name,
      team: mockMatch.team,
      position: mockMatch.position,
    };
  }

  return {
    name: `Player #${playerId}`,
    team: "",
    position: "FLX",
  };
};

export const fetchTrendingRadarPlayers = async (
  options: TrendingRadarOptions = {}
): Promise<TrendingPlayerItem[]> => {
  const {
    type = "add",
    lookbackHours = 24,
    limit = 25,
    tableData,
    league,
    signal,
    forceDemo = false,
  } = options;

  const ownershipMap = buildOwnershipMap(tableData, league);

  if (forceDemo) {
    return getMockTrendingRadarData(type, lookbackHours, ownershipMap);
  }

  try {
    const trendingItems: SleeperTrendingPlayer[] = await getTrendingPlayers(
      type,
      lookbackHours,
      limit,
      signal
    );

    if (!Array.isArray(trendingItems) || trendingItems.length === 0) {
      return getMockTrendingRadarData(type, lookbackHours, ownershipMap);
    }

    const playerIds = trendingItems
      .map((item) => item.player_id)
      .filter(Boolean);

    let playersMap = new Map<string, Player>();
    if (playerIds.length > 0) {
      try {
        playersMap = await getPlayersByIdsMap(playerIds, { signal });
      } catch (err) {
        console.warn("Unable to fetch full player map, using metadata fallbacks", err);
      }
    }

    const items: TrendingPlayerItem[] = trendingItems.map((trending) => {
      const pid = trending.player_id;
      const raw = playersMap.get(pid);
      const meta = resolvePlayerMetadata(pid, raw);
      const owner = ownershipMap.get(pid);
      const isAvailable = !owner;

      return {
        playerId: pid,
        name: meta.name,
        firstName: meta.firstName,
        lastName: meta.lastName,
        team: meta.team,
        position: meta.position,
        count: trending.count || 0,
        type,
        status: isAvailable ? "available" : "rostered",
        isAvailable,
        rosterId: owner?.rosterId,
        managerName: owner?.managerName,
        managerUsername: owner?.managerUsername,
        managerAvatar: owner?.managerAvatar,
        headshotUrl: getPlayerHeadshotUrl(pid, meta.position),
      };
    });

    return items;
  } catch (error) {
    console.error("Error loading trending radar players, using mock fallbacks:", error);
    return getMockTrendingRadarData(type, lookbackHours, ownershipMap);
  }
};

export const filterTrendingRadarList = (
  players: TrendingPlayerItem[],
  filters: {
    position?: PlayerPositionFilter | string;
    availableOnly?: boolean;
    searchQuery?: string;
  }
): TrendingPlayerItem[] => {
  const { position = "ALL", availableOnly = false, searchQuery = "" } = filters;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return players.filter((player) => {
    if (availableOnly && !player.isAvailable) {
      return false;
    }

    if (position && position !== "ALL") {
      if (position === "FLEX") {
        if (!["RB", "WR", "TE"].includes(player.position)) return false;
      } else if (player.position.toUpperCase() !== position.toUpperCase()) {
        return false;
      }
    }

    if (normalizedQuery.length > 0) {
      const nameMatch = player.name.toLowerCase().includes(normalizedQuery);
      const teamMatch = player.team.toLowerCase().includes(normalizedQuery);
      const posMatch = player.position.toLowerCase().includes(normalizedQuery);
      const managerMatch =
        player.managerName?.toLowerCase().includes(normalizedQuery) ||
        player.managerUsername?.toLowerCase().includes(normalizedQuery);

      if (!nameMatch && !teamMatch && !posMatch && !managerMatch) {
        return false;
      }
    }

    return true;
  });
};
