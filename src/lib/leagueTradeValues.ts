import { getPlayersByIdsMap } from "@/api/playerApi";
import {
  getDraftProjections,
  getStats,
  getTradedPicks,
  type SleeperTradedPick,
} from "@/api/sleeperApi";
import {
  getPlayerValues,
  type PlayerValuesResponse,
  type TradeValueRequestPayload,
} from "@/api/tradeValuesApi";
import {
  type DynastyPerspective,
  type TradeFinderPlayer,
  type TradeFinderRoster,
  type TradeValuationMode,
} from "@/lib/tradeFinder";
import { mapWithConcurrency } from "@/lib/async";
import { isSuperflexLeague } from "@/lib/lineup";
import { calculatePlayerTradeValue } from "@/lib/tradeCalculatorEngine";
import type { Player } from "@/types/apiTypes";
import type { LeagueInfoType, TableDataType } from "@/types/types";

export type LeagueTradeValueRoster = TradeFinderRoster;

export type LeaguePlayerValuesResult = PlayerValuesResponse & {
  rosters: LeagueTradeValueRoster[];
  request: TradeValueRequestPayload;
};

export type DynastyDraftPickAsset = {
  id: string;
  season: number;
  round: number;
  originalRosterId: number;
  ownerRosterId: number;
  label: string;
};

export const isDynastyLeague = (league?: LeagueInfoType | null) =>
  league?.seasonType?.toLowerCase() === "dynasty";

export const getTradeValuationMode = (
  league?: LeagueInfoType | null
): TradeValuationMode =>
  isDynastyLeague(league)
    ? "dynasty"
    : league?.status === "complete"
      ? "season results"
      : "ros projection";

export const buildDynastyDraftPickAssets = ({
  league,
  rosters,
  tradedPicks,
}: {
  league: LeagueInfoType;
  rosters: Array<{ id: number; managerName: string }>;
  tradedPicks: SleeperTradedPick[];
}): DynastyDraftPickAsset[] => {
  const leagueSeason = Number(league.season) || new Date().getFullYear();
  const firstPickSeason = ["pre_draft", "drafting"].includes(league.status)
    ? leagueSeason
    : leagueSeason + 1;
  const seasons = Array.from(
    new Set([
      firstPickSeason,
      firstPickSeason + 1,
      firstPickSeason + 2,
      ...tradedPicks
        .map((pick) => Number(pick.season))
        .filter((season) => season >= firstPickSeason),
    ])
  ).sort((a, b) => a - b);
  const rookieDraftPickCount = league.draftPicks?.length ?? 0;
  const recentDraftRounds =
    rookieDraftPickCount > 0 &&
    rookieDraftPickCount <= Math.max(1, league.totalRosters) * 8
      ? Math.max(
          ...(league.draftPicks ?? []).map((pick) => Number(pick.round) || 0)
        )
      : 0;
  const tradedPickRounds = Math.max(
    0,
    ...tradedPicks.map((pick) => pick.round)
  );
  const roundCount = Math.min(
    6,
    recentDraftRounds > 0
      ? Math.max(recentDraftRounds, tradedPickRounds)
      : Math.max(4, tradedPickRounds)
  );
  const rosterNameById = new Map(
    rosters.map((roster) => [roster.id, roster.managerName])
  );
  const currentOwnerByPick = new Map(
    tradedPicks.map((pick) => [
      `${pick.season}:${pick.round}:${pick.rosterId}`,
      pick.ownerId,
    ])
  );

  return seasons.flatMap((season) =>
    rosters.flatMap((originalRoster) =>
      Array.from({ length: roundCount }, (_, index) => {
        const round = index + 1;
        const id = `${season}:${round}:${originalRoster.id}`;
        const ownerRosterId = currentOwnerByPick.get(id) ?? originalRoster.id;
        const originalManager =
          rosterNameById.get(originalRoster.id) ??
          `Roster ${originalRoster.id}`;

        return {
          id,
          season,
          round,
          originalRosterId: originalRoster.id,
          ownerRosterId,
          label: `${season} Round ${round}${
            ownerRosterId !== originalRoster.id
              ? ` (from ${originalManager})`
              : ""
          }`,
        };
      })
    )
  );
};

export const loadDynastyDraftPickAssets = async ({
  league,
  rosters,
}: {
  league: LeagueInfoType;
  rosters: Array<{ id: number; managerName: string }>;
}): Promise<DynastyDraftPickAsset[]> => {
  if (!isDynastyLeague(league) || league.platform === "espn") return [];

  const tradedPicks = await getTradedPicks(league.leagueId);
  return buildDynastyDraftPickAssets({ league, rosters, tradedPicks });
};

const getWeekLineup = (team: TableDataType, weekIndex: number) => {
  const starters =
    Array.isArray(team.starters?.[weekIndex]) && team.starters[weekIndex]
      ? team.starters[weekIndex]
      : [];
  const benchByWeek = Array.isArray(team.benchPlayers?.[weekIndex])
    ? team.benchPlayers[weekIndex]
    : [];
  const bench =
    benchByWeek.length > 0
      ? benchByWeek
      : (team.players || []).filter((id) => !starters.includes(id));

  return { starters, bench };
};

export const getTradeValueWeek = (league: LeagueInfoType) => {
  const nextWeek = Math.min((league.lastScoredWeek || 0) + 1, 18);
  return Math.max(1, nextWeek);
};

export const buildTradeValueRequest = ({
  league,
  tableData,
  selectedWeek,
  showUsernames,
  dynastyPerspective = "balanced",
}: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
  dynastyPerspective?: DynastyPerspective;
}): TradeValueRequestPayload => {
  const weekIndex = selectedWeek - 1;
  const rosters = tableData.map((team) => {
    const { starters, bench } = getWeekLineup(team, weekIndex);
    const managerName = showUsernames
      ? team.username || team.name
      : team.name || team.username;
    return {
      id: team.rosterId,
      managerName: managerName || `Roster ${team.rosterId}`,
      playerIds: [...new Set([...starters, ...bench])],
    };
  });

  return {
    league: {
      leagueId: league.leagueId,
      season: league.season,
      status: league.status,
      scoringType: league.scoringType,
      scoringSettings: league.scoringSettings ?? {},
      rosterPositions: league.rosterPositions,
      totalRosters: league.totalRosters || tableData.length,
      seasonType: league.seasonType ?? "",
      platform: league.platform ?? "",
    },
    rosters,
    selectedWeek,
    remainingWeeks:
      league.status === "complete" ? 18 : Math.max(1, 18 - selectedWeek + 1),
    dynastyPerspective,
    finderForRosterId: null,
  };
};

const groupRankingsByRoster = (
  request: TradeValueRequestPayload,
  rankings: TradeFinderPlayer[]
): LeagueTradeValueRoster[] => {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.playerId, ranking])
  );
  return request.rosters.map((roster) => ({
    id: roster.id,
    managerName: roster.managerName,
    players: roster.playerIds
      .map((playerId) => rankingById.get(playerId))
      .filter((player): player is TradeFinderPlayer => player !== undefined)
      .map((player) => ({ ...player }))
      .sort((a, b) => a.overallRank - b.overallRank),
  }));
};

export const generateCalculatedLeaguePlayerValues = async (options: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
  dynastyPerspective?: DynastyPerspective;
}): Promise<LeaguePlayerValuesResult> => {
  const request = buildTradeValueRequest(options);
  const playerIds = [...new Set(request.rosters.flatMap((r) => r.playerIds))];
  const playerMap = await getPlayersByIdsMap(playerIds);
  const dynasty = isDynastyLeague(options.league);
  const superflex = isSuperflexLeague(options.league.rosterPositions);
  const idpPositions = new Set(["DB", "DL", "LB", "CB", "DE", "DT", "NT", "S"]);

  const playerStatsList = await mapWithConcurrency(
    playerIds,
    TRADE_BUILDER_RANKING_CONCURRENCY,
    async (playerId) => {
      const player = playerMap.get(playerId);
      if (dynasty) {
        const projection = await getDraftProjections(
          playerId,
          options.league.season,
          options.league.scoringType,
          "Dynasty",
          superflex,
          idpPositions.has(player?.position?.toUpperCase() ?? "")
        );
        return {
          playerId,
          dynastyAdp: projection.adp,
          projectedPoints: 0,
          statsRank: 0,
          statsOverallRank: 0,
        };
      }
      const stats = await getStats(
        playerId,
        options.league.season,
        options.league.scoringType
      );
      return {
        playerId,
        dynastyAdp: null,
        projectedPoints: Number(stats?.points || 0),
        statsRank: Number(stats?.rank || 0),
        statsOverallRank: Number(stats?.overallRank || 0),
      };
    }
  );

  const statsByPlayerId = new Map(
    playerStatsList.map((entry) => [entry.playerId, entry])
  );

  const playersByPos = new Map<
    string,
    Array<{ playerId: string; points: number; adp: number | null }>
  >();
  playerIds.forEach((playerId) => {
    const player = playerMap.get(playerId);
    if (!player) return;
    const pos = (player.position || "WR").toUpperCase();
    const stats = statsByPlayerId.get(playerId);
    if (!playersByPos.has(pos)) playersByPos.set(pos, []);
    playersByPos.get(pos)!.push({
      playerId,
      points: stats?.projectedPoints || 0,
      adp: stats?.dynastyAdp ?? null,
    });
  });

  const replacementPointsByPos = new Map<string, number>();
  playersByPos.forEach((list, pos) => {
    list.sort((a, b) => b.points - a.points);
    const baselineIndex = Math.min(
      list.length - 1,
      Math.max(0, Math.floor(list.length * 0.7))
    );
    replacementPointsByPos.set(pos, list[baselineIndex]?.points || 50);
  });

  const rankings: TradeFinderPlayer[] = playerIds
    .map((playerId) => {
      const player = playerMap.get(playerId);
      if (!player) return null;
      const pos = (player.position || "WR").toUpperCase();
      const stats = statsByPlayerId.get(playerId);
      const projectedPoints = stats?.projectedPoints || 0;
      const replacementPoints = replacementPointsByPos.get(pos) || 50;
      const vorp = projectedPoints - replacementPoints;
      const dynastyAdp = stats?.dynastyAdp ?? null;

      const tradeValue = calculatePlayerTradeValue(
        {
          playerId,
          position: pos,
          team: player.team,
          projectedPoints,
          replacementPoints,
          vorp,
          dynastyAdp,
          positionRank: stats?.statsRank,
        },
        {
          seasonType: dynasty ? "dynasty" : "redraft",
          valuationMode: dynasty ? "dynasty" : "ros projection",
          isSuperflex: superflex,
          scoringType: options.league.scoringType,
          currentSeason:
            Number(options.league.season) || new Date().getFullYear(),
          dynastyPerspective: options.dynastyPerspective || "balanced",
        }
      );

      return {
        playerId,
        position: pos,
        name: player.name || `${player.team} Defense`,
        team: player.team || "",
        projectedPoints,
        replacementPoints,
        vorp,
        tradeValue,
        positionRank: stats?.statsRank || 0,
        overallRank: stats?.statsOverallRank || 0,
        dynastyAdp,
      };
    })
    .filter((p): p is TradeFinderPlayer => p !== null);

  rankings.sort((a, b) => {
    if (dynasty && a.dynastyAdp && b.dynastyAdp) {
      return a.dynastyAdp - b.dynastyAdp;
    }
    return b.tradeValue - a.tradeValue || b.projectedPoints - a.projectedPoints;
  });

  const posCounters = new Map<string, number>();
  rankings.forEach((player, index) => {
    player.overallRank = index + 1;
    const currentPosCount = (posCounters.get(player.position) || 0) + 1;
    posCounters.set(player.position, currentPosCount);
    player.positionRank = currentPosCount;
  });

  return {
    access: "premium",
    previewLimit: rankings.length,
    totalPlayers: rankings.length,
    rankings,
    request,
    rosters: groupRankingsByRoster(request, rankings),
  };
};

export const loadLeaguePlayerValues = async (options: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
  dynastyPerspective?: DynastyPerspective;
}): Promise<LeaguePlayerValuesResult> => {
  const request = buildTradeValueRequest(options);
  try {
    const response = await getPlayerValues(request);
    if (response.access === "premium" && response.rankings.length > 0) {
      return {
        ...response,
        request,
        rosters: groupRankingsByRoster(request, response.rankings),
      };
    }
    // If backend returns preview or empty, fallback with complete local calculations
    return generateCalculatedLeaguePlayerValues(options);
  } catch (error) {
    console.warn("Backend playerValues call failed, generating local calculated player values:", error);
    return generateCalculatedLeaguePlayerValues(options);
  }
};

export type TradeBuilderPlayer = Player & {
  playerId: string;
  positionRank: number;
  overallRank: number;
  dynastyAdp: number | null;
};

export type TradeBuilderRoster = {
  id: number;
  managerName: string;
  players: TradeBuilderPlayer[];
};

type TradeBuilderBasicRanking = {
  positionRank: number;
  overallRank: number;
  dynastyAdp: number | null;
};

const TRADE_BUILDER_RANKING_CONCURRENCY = 8;

export const sortTradeBuilderPlayers = (
  players: TradeBuilderPlayer[]
): TradeBuilderPlayer[] => {
  const useOverallRank = players.some((player) => player.overallRank > 0);
  const rankValue = (player: TradeBuilderPlayer) => {
    const value = useOverallRank ? player.overallRank : player.dynastyAdp;
    return Number.isFinite(value) && Number(value) > 0
      ? Number(value)
      : Number.POSITIVE_INFINITY;
  };

  return [...players].sort(
    (a, b) =>
      rankValue(a) - rankValue(b) ||
      (a.positionRank > 0 ? a.positionRank : Number.POSITIVE_INFINITY) -
        (b.positionRank > 0 ? b.positionRank : Number.POSITIVE_INFINITY) ||
      (a.name || `${a.team} Defense`).localeCompare(
        b.name || `${b.team} Defense`
      )
  );
};

export const mergeTradeBuilderRankings = (
  rosters: TradeBuilderRoster[],
  rankings: TradeFinderPlayer[]
): TradeBuilderRoster[] => {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.playerId, ranking])
  );
  return rosters.map((roster) => ({
    ...roster,
    players: sortTradeBuilderPlayers(
      roster.players.map((player) => {
        const ranking = rankingById.get(player.playerId);
        return {
          ...player,
          positionRank: ranking?.positionRank ?? player.positionRank,
          overallRank: ranking?.overallRank ?? player.overallRank,
        };
      })
    ),
  }));
};

export const applyTradeBuilderRankingResponse = (
  rosters: TradeBuilderRoster[],
  response: Pick<PlayerValuesResponse, "access" | "rankings">
): TradeBuilderRoster[] =>
  response.access === "premium"
    ? mergeTradeBuilderRankings(rosters, response.rankings)
    : rosters;

export const loadTradeBuilderRosters = async (options: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
}): Promise<TradeBuilderRoster[]> => {
  const request = buildTradeValueRequest({
    ...options,
    dynastyPerspective: "balanced",
  });
  const playerIds = [...new Set(request.rosters.flatMap((r) => r.playerIds))];
  const playerMap = await getPlayersByIdsMap(playerIds);
  const dynasty = isDynastyLeague(options.league);
  const superflex = isSuperflexLeague(options.league.rosterPositions);
  const idpPositions = new Set(["DB", "DL", "LB", "CB", "DE", "DT", "NT", "S"]);
  const basicRankingEntries = await mapWithConcurrency(
    playerIds,
    TRADE_BUILDER_RANKING_CONCURRENCY,
    async (playerId): Promise<readonly [string, TradeBuilderBasicRanking]> => {
      if (dynasty) {
        const player = playerMap.get(playerId);
        const projection = await getDraftProjections(
          playerId,
          options.league.season,
          options.league.scoringType,
          "Dynasty",
          superflex,
          idpPositions.has(player?.position?.toUpperCase() ?? "")
        );
        return [
          playerId,
          {
            positionRank: 0,
            overallRank: 0,
            dynastyAdp: projection.adp,
          },
        ] as const;
      }

      const stats = await getStats(
        playerId,
        options.league.season,
        options.league.scoringType
      );
      return [
        playerId,
        {
          positionRank: Number(stats?.rank || 0),
          overallRank: Number(stats?.overallRank || 0),
          dynastyAdp: null,
        },
      ] as const;
    }
  );
  const basicRankingById = new Map(basicRankingEntries);
  return request.rosters.map((roster) => ({
    id: roster.id,
    managerName: roster.managerName,
    players: sortTradeBuilderPlayers(
      roster.playerIds
        .map((playerId) => {
          const player = playerMap.get(playerId);
          if (!player) return null;
          const basicRanking = basicRankingById.get(playerId);
          return {
            ...player,
            playerId,
            positionRank: basicRanking?.positionRank ?? 0,
            overallRank: basicRanking?.overallRank ?? 0,
            dynastyAdp: basicRanking?.dynastyAdp ?? null,
          };
        })
        .filter((player): player is TradeBuilderPlayer => player !== null)
    ),
  }));
};
