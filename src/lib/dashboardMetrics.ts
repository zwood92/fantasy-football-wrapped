import type {
  LeagueInfoType,
  TableDataType,
  TradeNameRow,
  WaiverMove,
} from "../types/types";
import {
  PODCAST_CAST_PROFILES,
  type PlayerLookupRecord,
  type PodcastDialogueSegment,
} from "./podcastEngine";

export interface DashboardDeltaItem {
  id: "standing" | "powerRank" | "playoffOdds" | "allPlay";
  label: string;
  currentDisplay: string;
  previousDisplay: string;
  deltaValue: number;
  deltaLabel: string;
  direction: "up" | "down" | "neutral";
  targetFeature:
    | "Standings"
    | "Power Rankings"
    | "Playoffs"
    | "Expected Wins";
}

export interface DashboardLineupSlot {
  playerId: string;
  name: string;
  position: string;
  points: number;
}

export interface DashboardWeekReviewItem {
  week: number;
  score: number;
  opponentRosterId: number | null;
  opponentName: string;
  opponentAvatar: string;
  opponentScore: number;
  leagueAverage: number;
  weeklyRank: number;
  totalTeams: number;
  result: "W" | "L" | "T";
  margin: number;
  topStarter: DashboardLineupSlot | null;
  benchTotal: number;
  starters: DashboardLineupSlot[];
  opponentStarters: DashboardLineupSlot[];
}

export interface DashboardMvpItem {
  playerId: string;
  name: string;
  position: string;
  starts: number;
  totalPoints: number;
  ppg: number;
}

export interface DashboardRosterBuildSplit {
  draftedPoints: number;
  draftedPct: number;
  pickupPoints: number;
  pickupPct: number;
  tradePoints: number;
  tradePct: number;
  totalStarterPoints: number;
}

export interface DashboardUpcomingMatchup {
  week: number;
  opponentRosterId: number;
  opponentName: string;
  opponentAvatar: string;
  opponentRecord: string;
  opponentRank: number;
  opponentPpg: number;
  difficulty: "Tough" | "Even" | "Favorable";
}

export interface DashboardAdditionInsight {
  playerId: string;
  name: string;
  position: string;
  weekAdded: number;
  bid: number | null;
  starts: number;
  pointsContributed: number;
  verdictTag: string;
}

export interface TeamDashboardModel {
  rosterId: number;
  teamName: string;
  username: string;
  avatarImg: string;
  leagueName: string;
  season: string;
  scoringBadges: string[];
  latestWeek: number;
  record: string;
  standing: number;
  totalTeams: number;
  powerRank: number;
  pointsFor: number;
  ppg: number;
  pointsAgainst: number;
  efficiencyPct: number;
  deltas: DashboardDeltaItem[];
  latestMatchup: DashboardWeekReviewItem | null;
  lineupInsight: {
    benchSwapCandidate: {
      benchPlayer: string;
      benchPoints: number;
      starterReplaced: string;
      starterPoints: number;
      netGain: number;
      wouldFlipResult: boolean;
    } | null;
    headline: string;
  };
  weeklyReview: DashboardWeekReviewItem[];
  mvps: DashboardMvpItem[];
  rosterBuild: DashboardRosterBuildSplit;
  playoffPath: {
    statusLabel:
      | "Clinched"
      | "Near Lock"
      | "Strong Contender"
      | "Playoff Bubble"
      | "Must-Win";
    playoffOddsPct: number;
    projectedSeed: number;
    projectedWins: number;
    expectedWins: number;
    luckDelta: number;
    nextMatchups: DashboardUpcomingMatchup[];
  };
  rosterActivity: {
    totalMoves: number;
    activityRank: number;
    waiverAddsCount: number;
    tradesCount: number;
    faabSpent: number;
    pickupSharePct: number;
    bestAdditions: DashboardAdditionInsight[];
    questionableAdditions: DashboardAdditionInsight[];
  };
  radioSpotlight: {
    week: number;
    headline: string;
    teaserLines: PodcastDialogueSegment[];
  };
}

function resolvePlayer(
  playerId: string | null | undefined,
  playerMap?: PlayerLookupRecord,
  fallbackObj?: { name?: string; position?: string } | null
): { name: string; position: string } {
  if (fallbackObj?.name) {
    return {
      name: fallbackObj.name,
      position: fallbackObj.position || "FLEX",
    };
  }
  if (!playerId || playerId === "0") {
    return { name: "Empty Slot", position: "BN" };
  }
  const entry = playerMap?.[playerId];
  if (entry?.name) {
    return {
      name: entry.name,
      position: entry.position || "FLEX",
    };
  }
  if (/^[A-Z]{2,3}$/.test(playerId)) {
    return { name: `${playerId} Defense`, position: "DEF" };
  }
  return { name: `Player #${playerId}`, position: "FLEX" };
}

function computeStandingsAtWeek(
  teams: TableDataType[],
  throughWeek: number
): Map<number, number> {
  const rows = teams.map((t) => {
    let wins = 0;
    let pf = 0;
    const maxW = Math.min(throughWeek, t.points?.length ?? 0);
    for (let w = 0; w < maxW; w += 1) {
      pf += Number(t.points?.[w] ?? 0);
      const oppId = t.matchups?.[w];
      const opp = oppId ? teams.find((x) => x.rosterId === oppId) : undefined;
      const myScore = Number(t.points?.[w] ?? 0);
      const oppScore = opp ? Number(opp.points?.[w] ?? 0) : 0;
      if (myScore > 0 || oppScore > 0) {
        if (myScore > oppScore) wins += 1;
        else if (myScore === oppScore) wins += 0.5;
      }
    }
    return { rosterId: t.rosterId, wins, pf };
  });

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pf - a.pf;
  });

  const rankMap = new Map<number, number>();
  rows.forEach((r, idx) => rankMap.set(r.rosterId, idx + 1));
  return rankMap;
}

function computePowerRanksAtWeek(
  teams: TableDataType[],
  throughWeek: number
): Map<number, number> {
  const rows = teams.map((t) => {
    const slice = (t.points ?? []).slice(0, throughWeek).filter((p) => p > 0);
    const avg =
      slice.length > 0
        ? slice.reduce((sum, p) => sum + p, 0) / slice.length
        : 0;
    const recentSlice = slice.slice(-3);
    const recentAvg =
      recentSlice.length > 0
        ? recentSlice.reduce((sum, p) => sum + p, 0) / recentSlice.length
        : avg;
    const powerScore = avg * 0.65 + recentAvg * 0.35;
    return { rosterId: t.rosterId, powerScore };
  });

  rows.sort((a, b) => b.powerScore - a.powerScore);
  const rankMap = new Map<number, number>();
  rows.forEach((r, idx) => rankMap.set(r.rosterId, idx + 1));
  return rankMap;
}

export function buildTeamDashboardModel(params: {
  teams: TableDataType[];
  selectedRosterId: number | null;
  league?: Partial<LeagueInfoType> | null;
  playerMap?: PlayerLookupRecord;
  showUsernames?: boolean;
  extraWaiverMoves?: WaiverMove[];
  extraTradeNames?: TradeNameRow[];
}): TeamDashboardModel | null {
  const { teams, league, playerMap, showUsernames = false } = params;
  if (!teams || teams.length === 0) return null;

  const team =
    teams.find((t) => t.rosterId === params.selectedRosterId) ?? teams[0];
  const totalTeams = teams.length;

  const displayName = (t: TableDataType) =>
    showUsernames
      ? t.username || t.name || `Team ${t.rosterId}`
      : t.name || t.username || `Team ${t.rosterId}`;

  // Determine scored weeks
  const maxPointsWeeks = Math.max(
    ...teams.map(
      (t) => (t.points ?? []).filter((pts) => Number(pts) > 0).length
    ),
    0
  );
  const configuredScoredWeek = league?.lastScoredWeek || maxPointsWeeks || 1;
  const latestWeek = Math.max(
    1,
    Math.min(configuredScoredWeek, Math.max(1, team.points?.length ?? 1))
  );

  // Standings & Power Rank (current vs previous week)
  const sortedByStandings = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });
  const currentStanding =
    sortedByStandings.findIndex((t) => t.rosterId === team.rosterId) + 1 || 1;

  const sortedByRating = [...teams].sort(
    (a, b) => (b.rating ?? b.pointsFor) - (a.rating ?? a.pointsFor)
  );
  const currentPowerRank =
    sortedByRating.findIndex((t) => t.rosterId === team.rosterId) + 1 || 1;

  const prevWeek = Math.max(1, latestWeek - 1);
  const prevStandingsMap = computeStandingsAtWeek(teams, prevWeek);
  const currStandingsFromPoints = computeStandingsAtWeek(teams, latestWeek);
  const prevStanding =
    latestWeek > 1
      ? (prevStandingsMap.get(team.rosterId) ?? currentStanding)
      : currentStanding;
  const effectiveCurrStanding =
    latestWeek > 1 && maxPointsWeeks >= latestWeek
      ? currentStanding
      : (currStandingsFromPoints.get(team.rosterId) ?? currentStanding);

  const prevPowerMap = computePowerRanksAtWeek(teams, prevWeek);
  const prevPowerRank =
    latestWeek > 1
      ? (prevPowerMap.get(team.rosterId) ?? currentPowerRank)
      : currentPowerRank;

  // Playoff Odds & Path
  const playoffTeams = league?.playoffTeams || Math.min(6, Math.floor(totalTeams / 2) + 1);
  const regSeasonLen = league?.regularSeasonLength || 14;
  const remainingWeeks = Math.max(0, regSeasonLen - latestWeek);

  const matchedProjection = league?.playoffProjections?.find(
    (p) => p.id === team.id || p.name === team.name || p.username === team.username
  );

  const gamesPlayed = Math.max(1, team.wins + team.losses + team.ties);
  const winPct = (team.wins + team.ties * 0.5) / gamesPlayed;
  const allPlayTotal = Math.max(1, team.winsAgainstAll + team.lossesAgainstAll);
  const allPlayPct = Number(((team.winsAgainstAll / allPlayTotal) * 100).toFixed(1));

  let playoffOddsPct = matchedProjection?.playoffPercentage;
  if (playoffOddsPct === undefined || playoffOddsPct === null) {
    const rankFactor = (totalTeams - effectiveCurrStanding + 1) / totalTeams;
    const rawOdds =
      (winPct * 0.55 + (allPlayPct / 100) * 0.3 + rankFactor * 0.15) * 108;
    playoffOddsPct = Math.max(2, Math.min(99, Math.round(rawOdds)));
    if (effectiveCurrStanding <= Math.max(1, Math.floor(playoffTeams / 3)) && winPct >= 0.72) {
      playoffOddsPct = Math.max(playoffOddsPct, 94);
    }
  } else {
    playoffOddsPct = Math.round(playoffOddsPct);
  }

  const projectedWins = matchedProjection?.projectedWinsTotal
    ? Number(matchedProjection.projectedWinsTotal.toFixed(1))
    : Number(
        (
          team.wins +
          remainingWeeks * (winPct * 0.45 + (allPlayPct / 100) * 0.55)
        ).toFixed(1)
      );

  const statusLabel: TeamDashboardModel["playoffPath"]["statusLabel"] =
    playoffOddsPct >= 97
      ? "Clinched"
      : playoffOddsPct >= 82
        ? "Near Lock"
        : playoffOddsPct >= 60
          ? "Strong Contender"
          : playoffOddsPct >= 32
            ? "Playoff Bubble"
            : "Must-Win";

  // Deltas
  const standingDiff = prevStanding - effectiveCurrStanding; // positive = moved UP in rank
  const powerDiff = prevPowerRank - currentPowerRank;

  const deltas: DashboardDeltaItem[] = [
    {
      id: "standing",
      label: "Standing",
      currentDisplay: `#${effectiveCurrStanding} of ${totalTeams}`,
      previousDisplay: `#${prevStanding}`,
      deltaValue: standingDiff,
      deltaLabel:
        standingDiff > 0
          ? `Up ${standingDiff} ${standingDiff === 1 ? "spot" : "spots"}`
          : standingDiff < 0
            ? `Down ${Math.abs(standingDiff)} ${Math.abs(standingDiff) === 1 ? "spot" : "spots"}`
            : "No change",
      direction: standingDiff > 0 ? "up" : standingDiff < 0 ? "down" : "neutral",
      targetFeature: "Standings",
    },
    {
      id: "powerRank",
      label: "Power Rank",
      currentDisplay: `#${currentPowerRank} of ${totalTeams}`,
      previousDisplay: `#${prevPowerRank}`,
      deltaValue: powerDiff,
      deltaLabel:
        powerDiff > 0
          ? `Up ${powerDiff} ${powerDiff === 1 ? "spot" : "spots"}`
          : powerDiff < 0
            ? `Down ${Math.abs(powerDiff)} ${Math.abs(powerDiff) === 1 ? "spot" : "spots"}`
            : "Steady",
      direction: powerDiff > 0 ? "up" : powerDiff < 0 ? "down" : "neutral",
      targetFeature: "Power Rankings",
    },
    {
      id: "playoffOdds",
      label: "Playoff Chances",
      currentDisplay: `${playoffOddsPct}%`,
      previousDisplay: statusLabel,
      deltaValue: playoffOddsPct - 50,
      deltaLabel: statusLabel,
      direction:
        playoffOddsPct >= 65
          ? "up"
          : playoffOddsPct <= 35
            ? "down"
            : "neutral",
      targetFeature: "Playoffs",
    },
    {
      id: "allPlay",
      label: "All-Play Win %",
      currentDisplay: `${allPlayPct}%`,
      previousDisplay: `${team.winsAgainstAll}-${team.lossesAgainstAll}`,
      deltaValue: Number((allPlayPct - 50).toFixed(1)),
      deltaLabel: `${team.winsAgainstAll}-${team.lossesAgainstAll} vs all`,
      direction: allPlayPct >= 55 ? "up" : allPlayPct <= 45 ? "down" : "neutral",
      targetFeature: "Expected Wins",
    },
  ];

  // Weekly Review & Latest Matchup
  const weeklyReview: DashboardWeekReviewItem[] = [];
  const buildSlotsForTeamWeek = (
    targetTeam: TableDataType,
    wIdx: number
  ): DashboardLineupSlot[] => {
    const ids = targetTeam.starters?.[wIdx] ?? [];
    const pts = targetTeam.starterPoints?.[wIdx] ?? [];
    const namesRow = targetTeam.starterNames?.[wIdx] ?? [];
    const len = Math.max(ids.length, pts.length);
    const slots: DashboardLineupSlot[] = [];
    for (let i = 0; i < len; i += 1) {
      const pId = String(ids[i] ?? `slot-${i}`);
      const resolved = resolvePlayer(pId, playerMap, namesRow[i] ?? null);
      slots.push({
        playerId: pId,
        name: resolved.name,
        position: resolved.position,
        points: Number((pts[i] ?? 0).toFixed(2)),
      });
    }
    return slots;
  };

  for (let w = 1; w <= latestWeek; w += 1) {
    const wIdx = w - 1;
    const myScore = Number((team.points?.[wIdx] ?? 0).toFixed(2));
    const oppId = team.matchups?.[wIdx] ?? null;
    const oppTeam =
      oppId !== null ? teams.find((t) => t.rosterId === oppId) : undefined;
    const oppScore = oppTeam
      ? Number((oppTeam.points?.[wIdx] ?? 0).toFixed(2))
      : 0;

    if (myScore === 0 && oppScore === 0 && w > 1) continue;

    const weekScores = teams
      .map((t) => Number(t.points?.[wIdx] ?? 0))
      .filter((s) => s > 0);
    const leagueAvg =
      weekScores.length > 0
        ? Number(
            (
              weekScores.reduce((sum, s) => sum + s, 0) / weekScores.length
            ).toFixed(2)
          )
        : 0;
    const sortedScores = [...weekScores].sort((a, b) => b - a);
    const weeklyRank = Math.max(1, sortedScores.indexOf(myScore) + 1);

    const starters = buildSlotsForTeamWeek(team, wIdx);
    const opponentStarters = oppTeam ? buildSlotsForTeamWeek(oppTeam, wIdx) : [];
    const topStarter =
      starters.length > 0
        ? [...starters].sort((a, b) => b.points - a.points)[0]
        : null;

    const benchTotal = Number(
      (team.benchPoints?.[wIdx] ?? [])
        .reduce((sum, p) => sum + Number(p ?? 0), 0)
        .toFixed(2)
    );

    const result: "W" | "L" | "T" =
      myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T";

    weeklyReview.push({
      week: w,
      score: myScore,
      opponentRosterId: oppId,
      opponentName: oppTeam ? displayName(oppTeam) : "League Average",
      opponentAvatar: oppTeam?.avatarImg || "/avatars/avatar4.svg",
      opponentScore: oppScore,
      leagueAverage: leagueAvg,
      weeklyRank,
      totalTeams,
      result,
      margin: Number(Math.abs(myScore - oppScore).toFixed(2)),
      topStarter,
      benchTotal,
      starters,
      opponentStarters,
    });
  }

  const latestMatchup =
    weeklyReview.length > 0 ? weeklyReview[weeklyReview.length - 1] : null;

  // Lineup Insight for latest week
  let benchSwapCandidate: TeamDashboardModel["lineupInsight"]["benchSwapCandidate"] =
    null;
  if (latestMatchup) {
    const lIdx = latestMatchup.week - 1;
    const benchIds = team.benchPlayers?.[lIdx] ?? [];
    const benchPts = team.benchPoints?.[lIdx] ?? [];
    const benchNames = team.benchNames?.[lIdx] ?? [];
    let bestBench: DashboardLineupSlot | null = null;
    for (let i = 0; i < benchPts.length; i += 1) {
      const pts = Number(benchPts[i] ?? 0);
      const pId = String(benchIds[i] ?? `bench-${i}`);
      const resolved = resolvePlayer(pId, playerMap, benchNames[i] ?? null);
      if (!bestBench || pts > bestBench.points) {
        bestBench = {
          playerId: pId,
          name: resolved.name,
          position: resolved.position,
          points: Number(pts.toFixed(2)),
        };
      }
    }
    const worstStarter =
      latestMatchup.starters.length > 0
        ? [...latestMatchup.starters].sort((a, b) => a.points - b.points)[0]
        : null;

    if (
      bestBench &&
      worstStarter &&
      bestBench.points - worstStarter.points >= 4
    ) {
      const netGain = Number(
        (bestBench.points - worstStarter.points).toFixed(2)
      );
      benchSwapCandidate = {
        benchPlayer: bestBench.name,
        benchPoints: bestBench.points,
        starterReplaced: worstStarter.name,
        starterPoints: worstStarter.points,
        netGain,
        wouldFlipResult:
          latestMatchup.result === "L" && netGain > latestMatchup.margin,
      };
    }
  }

  const lineupHeadline = benchSwapCandidate
    ? benchSwapCandidate.wouldFlipResult
      ? `Starting ${benchSwapCandidate.benchPlayer} (${benchSwapCandidate.benchPoints} pts) over ${benchSwapCandidate.starterReplaced} (${benchSwapCandidate.starterPoints} pts) would have flipped Week ${latestMatchup?.week} into a WIN (+${benchSwapCandidate.netGain} pts).`
      : `Best available bench upgrade in Week ${latestMatchup?.week}: ${benchSwapCandidate.benchPlayer} (+${benchSwapCandidate.netGain} pts over ${benchSwapCandidate.starterReplaced}).`
    : `Clean Week ${latestMatchup?.week ?? latestWeek} management — no high-leverage points stranded on your bench.`;

  // Team MVPs & How Your Team Was Built
  const pickupPlayerWeekMap = new Map<string, { week: number; bid: number | null }>();
  const tradedPlayerIds = new Set<string>();

  const allWaiverMoves =
    params.extraWaiverMoves ?? league?.waiverMoves ?? [];
  for (const wm of allWaiverMoves) {
    if (
      Number(wm.id) === team.rosterId ||
      wm.user?.name === team.name ||
      wm.user?.username === team.username
    ) {
      if (wm.player_id) {
        pickupPlayerWeekMap.set(String(wm.player_id), {
          week: wm.week,
          bid: wm.bid,
        });
      }
    }
  }
  for (const w of league?.waivers ?? []) {
    if (w.status === "complete" && w.roster_ids?.[0] === team.rosterId && w.adds) {
      for (const pId of Object.keys(w.adds)) {
        if (!pickupPlayerWeekMap.has(pId)) {
          pickupPlayerWeekMap.set(pId, {
            week: w.leg,
            bid: w.settings?.waiver_bid ?? null,
          });
        }
      }
    }
  }

  for (const tr of league?.trades ?? []) {
    if (tr.adds && tr.roster_ids?.includes(team.rosterId)) {
      for (const [pId, ownerRosterId] of Object.entries(tr.adds)) {
        if (ownerRosterId === team.rosterId) {
          tradedPlayerIds.add(pId);
        }
      }
    }
  }
  const allTradeNames = params.extraTradeNames ?? league?.tradeNames ?? [];
  for (const tn of allTradeNames) {
    if (
      tn.team1.user.name === team.name ||
      tn.team1.user.username === team.username
    ) {
      for (const pId of tn.team1.playerIds ?? []) tradedPlayerIds.add(pId);
    } else if (
      tn.team2.user.name === team.name ||
      tn.team2.user.username === team.username
    ) {
      for (const pId of tn.team2.playerIds ?? []) tradedPlayerIds.add(pId);
    }
  }

  const mvpAggregator = new Map<
    string,
    { name: string; position: string; starts: number; totalPoints: number }
  >();
  let draftedPoints = 0;
  let pickupPoints = 0;
  let tradePoints = 0;

  for (let wIdx = 0; wIdx < latestWeek; wIdx += 1) {
    const ids = team.starters?.[wIdx] ?? [];
    const pts = team.starterPoints?.[wIdx] ?? [];
    const namesRow = team.starterNames?.[wIdx] ?? [];
    for (let i = 0; i < pts.length; i += 1) {
      const score = Number(pts[i] ?? 0);
      const pId = String(ids[i] ?? "");
      if (!pId || pId === "0") continue;

      const resolved = resolvePlayer(pId, playerMap, namesRow[i] ?? null);
      const prev = mvpAggregator.get(pId);
      if (!prev) {
        mvpAggregator.set(pId, {
          name: resolved.name,
          position: resolved.position,
          starts: 1,
          totalPoints: score,
        });
      } else {
        prev.starts += 1;
        prev.totalPoints += score;
      }

      if (tradedPlayerIds.has(pId)) {
        tradePoints += score;
      } else if (pickupPlayerWeekMap.has(pId)) {
        pickupPoints += score;
      } else {
        draftedPoints += score;
      }
    }
  }

  // If starter arrays weren't populated (e.g. lightweight demo fixture), estimate split gracefully
  const totalStarterPointsRaw = draftedPoints + pickupPoints + tradePoints;
  if (totalStarterPointsRaw === 0 && team.pointsFor > 0) {
    const pickupRatio = Math.min(0.38, pickupPlayerWeekMap.size * 0.06);
    const tradeRatio = Math.min(0.22, tradedPlayerIds.size * 0.08);
    pickupPoints = team.pointsFor * pickupRatio;
    tradePoints = team.pointsFor * tradeRatio;
    draftedPoints = Math.max(0, team.pointsFor - pickupPoints - tradePoints);
  }
  const totalStarterPoints = Math.max(
    1,
    draftedPoints + pickupPoints + tradePoints
  );

  const mvps: DashboardMvpItem[] = Array.from(mvpAggregator.entries())
    .map(([playerId, data]) => ({
      playerId,
      name: data.name,
      position: data.position,
      starts: data.starts,
      totalPoints: Number(data.totalPoints.toFixed(1)),
      ppg: Number((data.totalPoints / Math.max(1, data.starts)).toFixed(1)),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 4);

  // Next 3 Matchups
  const nextMatchups: DashboardUpcomingMatchup[] = [];
  const allTeamPpgs = teams.map((t) => {
    const gp = Math.max(1, (t.points ?? []).filter((p) => p > 0).length);
    return t.pointsFor / gp;
  });
  const medianTeamPpg =
    [...allTeamPpgs].sort((a, b) => a - b)[Math.floor(allTeamPpgs.length / 2)] ||
    110;

  for (
    let futureW = latestWeek + 1;
    futureW <= Math.min(regSeasonLen, latestWeek + 3);
    futureW += 1
  ) {
    const oppId = team.matchups?.[futureW - 1];
    if (!oppId) continue;
    const opp = teams.find((t) => t.rosterId === oppId);
    if (!opp) continue;
    const oppStanding =
      sortedByStandings.findIndex((t) => t.rosterId === opp.rosterId) + 1 || 1;
    const oppGp = Math.max(1, (opp.points ?? []).filter((p) => p > 0).length);
    const oppPpg = Number((opp.pointsFor / oppGp).toFixed(1));
    const difficulty: DashboardUpcomingMatchup["difficulty"] =
      oppPpg >= medianTeamPpg + 5
        ? "Tough"
        : oppPpg <= medianTeamPpg - 5
          ? "Favorable"
          : "Even";

    nextMatchups.push({
      week: futureW,
      opponentRosterId: opp.rosterId,
      opponentName: displayName(opp),
      opponentAvatar: opp.avatarImg || "/avatars/avatar5.svg",
      opponentRecord: `${opp.wins}-${opp.losses}${opp.ties ? `-${opp.ties}` : ""}`,
      opponentRank: oppStanding,
      opponentPpg: oppPpg,
      difficulty,
    });
  }

  // Roster Activity: Best & Questionable Additions
  const additionInsights: DashboardAdditionInsight[] = [];
  for (const [pId, meta] of pickupPlayerWeekMap.entries()) {
    const resolved = resolvePlayer(pId, playerMap);
    // Also check waiverMoves for friendly name if playerMap missed it
    const namedMove = allWaiverMoves.find((m) => String(m.player_id) === pId);
    const finalName = namedMove?.adds || resolved.name;
    const finalPos = namedMove?.position || resolved.position;

    let startsAfterAdd = 0;
    let ptsAfterAdd = 0;
    for (let wIdx = Math.max(0, meta.week - 1); wIdx < latestWeek; wIdx += 1) {
      const sIds = team.starters?.[wIdx] ?? [];
      const posIdx = sIds.indexOf(pId);
      if (posIdx !== -1) {
        startsAfterAdd += 1;
        ptsAfterAdd += Number(team.starterPoints?.[wIdx]?.[posIdx] ?? 0);
      }
    }

    const bidLabel =
      meta.bid !== null && meta.bid > 0 ? `$${meta.bid} FAAB` : "Free Agent";
    const verdictTag =
      startsAfterAdd === 0
        ? `${bidLabel} · Never started`
        : ptsAfterAdd >= 35
          ? `${bidLabel} · League-winner impact`
          : ptsAfterAdd < 8
            ? `${bidLabel} · ${ptsAfterAdd.toFixed(1)} pts in ${startsAfterAdd} start${startsAfterAdd === 1 ? "" : "s"}`
            : `${bidLabel} · ${startsAfterAdd} start${startsAfterAdd === 1 ? "" : "s"}`;

    additionInsights.push({
      playerId: pId,
      name: finalName,
      position: finalPos,
      weekAdded: meta.week,
      bid: meta.bid,
      starts: startsAfterAdd,
      pointsContributed: Number(ptsAfterAdd.toFixed(1)),
      verdictTag,
    });
  }

  const bestAdditions = [...additionInsights]
    .filter((a) => a.pointsContributed > 0)
    .sort((a, b) => b.pointsContributed - a.pointsContributed)
    .slice(0, 3);

  const questionableAdditions = [...additionInsights]
    .filter((a) => a.starts === 0 || a.pointsContributed < 8)
    .sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0))
    .slice(0, 3);

  // Total Moves & Activity Rank
  const txEntries = teams.map((t) => {
    const rawTx = league?.transactions?.[t.id];
    const count =
      typeof rawTx === "number"
        ? rawTx
        : pickupPlayerWeekMap.size + tradedPlayerIds.size;
    return { rosterId: t.rosterId, count };
  });
  txEntries.sort((a, b) => b.count - a.count);
  const myMoves =
    txEntries.find((e) => e.rosterId === team.rosterId)?.count ??
    pickupPlayerWeekMap.size;
  const activityRank =
    txEntries.findIndex((e) => e.rosterId === team.rosterId) + 1 || 1;

  const faabSpent = Array.from(pickupPlayerWeekMap.values()).reduce(
    (sum, item) => sum + (item.bid && item.bid > 0 ? item.bid : 0),
    0
  );

  // Scoring badges
  const scoringBadges: string[] = [];
  const recPts = league?.scoringSettings?.rec;
  if (recPts === 1 || league?.scoringType === 1) scoringBadges.push("Full PPR");
  else if (recPts === 0.5 || league?.scoringType === 2)
    scoringBadges.push("Half PPR");
  else if (recPts === 0) scoringBadges.push("Standard");
  if (league?.scoringSettings?.pass_td) {
    scoringBadges.push(`${league.scoringSettings.pass_td}-pt Pass TD`);
  }
  if (league?.seasonType) scoringBadges.push(league.seasonType);
  scoringBadges.push(`${totalTeams}-Team`);

  const myDisplayName = displayName(team);
  const recordStr = `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ""}`;
  const ppg = Number((team.pointsFor / gamesPlayed).toFixed(1));
  const efficiencyPct = Number(
    (
      (team.managerEfficiency
        ? team.managerEfficiency <= 1
          ? team.managerEfficiency * 100
          : team.managerEfficiency
        : team.potentialPoints > 0
          ? (team.pointsFor / team.potentialPoints) * 100
          : 88.5)
    ).toFixed(1)
  );
  const expectedWins = Number((team.randomScheduleWins ?? team.wins).toFixed(1));
  const luckDelta = Number((team.wins - expectedWins).toFixed(1));
  const pickupSharePct = Number(
    ((pickupPoints / totalStarterPoints) * 100).toFixed(1)
  );

  // Personalized 3-Host Radio Spotlight Teaser for this team!
  const lastResultWon = latestMatchup?.result === "W";
  const radioSpotlightLines: PodcastDialogueSegment[] = [
    {
      speaker: "Beat Reporter",
      characterName: PODCAST_CAST_PROFILES.reporter.characterName,
      role: PODCAST_CAST_PROFILES.reporter.role,
      avatar: PODCAST_CAST_PROFILES.reporter.avatar,
      tone: "breaking",
      topic: `${myDisplayName} Desk`,
      text: latestMatchup
        ? `Per locker-room sources, ${myDisplayName} (${recordStr}, #${effectiveCurrStanding} in ${league?.name || "the league"}) is ${lastResultWon ? `taking an obnoxious victory lap after ${latestMatchup.margin >= 25 ? "annihilating" : "taking down"} ${latestMatchup.opponentName} ${latestMatchup.score.toFixed(1)}–${latestMatchup.opponentScore.toFixed(1)}` : `in full damage-control mode after falling ${latestMatchup.score.toFixed(1)}–${latestMatchup.opponentScore.toFixed(1)} to ${latestMatchup.opponentName}`} in Week ${latestMatchup.week}.`
        : `Sources confirm ${myDisplayName} sits at ${recordStr} (#${effectiveCurrStanding} overall) as the broadcast booth opens the Week ${latestWeek} tape.`,
    },
    {
      speaker: "Analytical Guru",
      characterName: PODCAST_CAST_PROFILES.guru.characterName,
      role: PODCAST_CAST_PROFILES.guru.role,
      avatar: PODCAST_CAST_PROFILES.guru.avatar,
      tone: "analytical",
      topic: "Efficiency & Luck Audit",
      text: `Let's check the math on ${myDisplayName}: ${ppg} PPG, ${efficiencyPct}% lineup efficiency, and ${luckDelta >= 1 ? `+${luckDelta} wins ABOVE expected—meaning schedule variance has been gifting them free real estate` : luckDelta <= -1 ? `${luckDelta} wins BELOW expected—a textbook unlucky powerhouse getting hosed by opponent ceilings` : `a ${expectedWins} expected-win baseline that matches their ${recordStr} record to the decimal`}. Playoff probability sits at ${playoffOddsPct}%.`,
    },
    {
      speaker: "Comedian",
      characterName: PODCAST_CAST_PROFILES.comedian.characterName,
      role: PODCAST_CAST_PROFILES.comedian.role,
      avatar: PODCAST_CAST_PROFILES.comedian.avatar,
      tone: "sarcastic",
      topic: "Johnny's Verdict",
      text: benchSwapCandidate?.wouldFlipResult
        ? `Forget the math, TurboTax—${myDisplayName} literally left ${benchSwapCandidate.benchPlayer}'s ${benchSwapCandidate.benchPoints} points on the bench in a winnable loss! Put down your phone at 12:58 PM Sunday!`
        : lastResultWon
          ? `Hey, a win is a win! ${luckDelta >= 1.2 ? `Sure, ${myDisplayName} is riding pure horseshoe magic right now, so enjoy the fraudulent W before karma collects the rent!` : `${myDisplayName} is actually cooking right now—don't ruin it with a galaxy-brain trade at 2 AM!`}`
          : `Chin up, ${myDisplayName}! At ${playoffOddsPct}% playoff odds, you're not dead yet—just stop starting guys who score cardio points!`,
    },
  ];

  return {
    rosterId: team.rosterId,
    teamName: myDisplayName,
    username: team.username,
    avatarImg: team.avatarImg || "/avatars/avatar1.svg",
    leagueName: league?.name || "Demo Championship League",
    season: String(league?.season || "2025"),
    scoringBadges,
    latestWeek,
    record: recordStr,
    standing: effectiveCurrStanding,
    totalTeams,
    powerRank: currentPowerRank,
    pointsFor: Number(team.pointsFor.toFixed(1)),
    ppg,
    pointsAgainst: Number(team.pointsAgainst.toFixed(1)),
    efficiencyPct,
    deltas,
    latestMatchup,
    lineupInsight: {
      benchSwapCandidate,
      headline: lineupHeadline,
    },
    weeklyReview,
    mvps,
    rosterBuild: {
      draftedPoints: Number(draftedPoints.toFixed(1)),
      draftedPct: Number(((draftedPoints / totalStarterPoints) * 100).toFixed(1)),
      pickupPoints: Number(pickupPoints.toFixed(1)),
      pickupPct: pickupSharePct,
      tradePoints: Number(tradePoints.toFixed(1)),
      tradePct: Number(((tradePoints / totalStarterPoints) * 100).toFixed(1)),
      totalStarterPoints: Number(totalStarterPoints.toFixed(1)),
    },
    playoffPath: {
      statusLabel,
      playoffOddsPct,
      projectedSeed: effectiveCurrStanding,
      projectedWins,
      expectedWins,
      luckDelta,
      nextMatchups,
    },
    rosterActivity: {
      totalMoves: myMoves,
      activityRank,
      waiverAddsCount: pickupPlayerWeekMap.size,
      tradesCount: tradedPlayerIds.size,
      faabSpent,
      pickupSharePct,
      bestAdditions,
      questionableAdditions,
    },
    radioSpotlight: {
      week: latestMatchup?.week ?? latestWeek,
      headline: `What the 98.7 Radio Booth is saying about ${myDisplayName} in Week ${latestMatchup?.week ?? latestWeek}`,
      teaserLines: radioSpotlightLines,
    },
  };
}
