import { mean, max, min, sum } from "./collection";
import { standardDeviation, getMedian } from "../api/helper";
import type {
  TableDataType,
  LeagueInfoType,
  PlayerRankingsType,
  PlayerType,
} from "../types/types";

export type PositionKey = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";

export const POSITIONS_LIST: PositionKey[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

export type PositionalGrade = {
  position: PositionKey;
  score: number; // 0-100 index
  letterGrade:
    | "A+"
    | "A"
    | "A-"
    | "B+"
    | "B"
    | "B-"
    | "C+"
    | "C"
    | "C-"
    | "D+"
    | "D"
    | "F";
  rank: number; // 1 to leagueTotal
  totalPoints: number;
  ppg: number;
  starterAvg: number;
  benchAvg: number;
  leagueAvgPpg: number;
  leagueMaxPpg: number;
  tier: "Elite" | "Strong" | "Average" | "Vulnerable" | "Critical Need";
  keyStarters: Array<{ playerId?: string; name: string; team?: string; points?: number; ppg?: number }>;
  keyBench: Array<{ playerId?: string; name: string; team?: string; points?: number; ppg?: number }>;
};

export type LuckAnalysis = {
  actualWins: number;
  expectedWins: number;
  luckDelta: number; // actual - expected
  luckGrade: "Luck God" | "Fortunate" | "Neutral" | "Unlucky" | "Snakebitten";
  pointsAgainst: number;
  leagueAvgPointsAgainst: number;
  pointsAgainstDiff: number; // PA - LeagueAvg
  pointsAgainstRank: number; // 1 = toughest schedule / most points against
  scheduleDifficulty:
    | "Brutal"
    | "Tough"
    | "Average"
    | "Favorable"
    | "Cake Walk";
  luckScore: number; // 0-100 (50 is neutral, >50 lucky, <50 unlucky)
  explanation: string;
};

export type WeeklyScoreDetail = {
  week: number;
  score: number;
  leagueMedian: number;
  result: "W" | "L" | "T" | "-";
  opponentScore?: number;
  opponentName?: string;
  isBoom: boolean;
  isBust: boolean;
};

export type ConsistencyMetrics = {
  averageScore: number;
  medianScore: number;
  standardDeviation: number;
  ceiling: number;
  floor: number;
  range: number;
  coefficientOfVariation: number; // (stdDev / mean) * 100
  volatilityLabel:
    | "Rock Solid"
    | "Moderately Consistent"
    | "High Volatility"
    | "Wild Rollercoaster";
  boomWeeks: number;
  bustWeeks: number;
  neutralWeeks: number;
  weeklyScores: WeeklyScoreDetail[];
  trend: "Trending Up" | "Trending Down" | "Steady";
  trendDelta: number;
};

export type LineupEfficiencyMetrics = {
  actualPoints: number;
  potentialPoints: number;
  efficiencyPercentage: number;
  pointsLeftOnBench: number;
  pointsLeftOnBenchPerWeek: number;
  efficiencyRank: number;
  efficiencyGrade: string;
  benchPointsTotal: number;
  benchPointsAvg: number;
  rosterDepthScore: number; // 0-100
  starterReliabilityIndex: number; // 0-100
};

export type RemainingOpponent = {
  week: number;
  opponentName: string;
  opponentUsername?: string;
  opponentRecord: string;
  opponentRank: number;
  opponentAvgPpg: number;
  difficulty: "Easy" | "Neutral" | "Hard";
};

export type PlayoffPathAnalysis = {
  currentRank: number;
  currentRecord: string;
  playoffProbability: number; // 0 - 100 %
  playoffTeams: number;
  totalTeams: number;
  projectedWinsTotal: number;
  clinchStatus:
    | "Clinched"
    | "High Odds"
    | "In the Hunt"
    | "Bubble Team"
    | "Longshot"
    | "Eliminated";
  remainingOpponents: RemainingOpponent[];
  remainingScheduleStrength: "Easy" | "Moderate" | "Difficult" | "Nightmare";
  magicNumber?: number;
};

export type RosterAlert = {
  type: "warning" | "info" | "success";
  title: string;
  description: string;
  playerId?: string;
  playerName?: string;
  playerPosition?: string;
  playerTeam?: string;
};

export type TeamDiagnosticSummary = {
  overallRating: number; // 0-100
  powerRank: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiOutlook: string;
  rosterAlerts: RosterAlert[];
};

export type FullTeamAnalysis = {
  team: TableDataType;
  positionalGrades: Record<PositionKey, PositionalGrade>;
  positionalRadarData: {
    categories: PositionKey[];
    teamScores: number[];
    leagueAverages: number[];
  };
  luck: LuckAnalysis;
  consistency: ConsistencyMetrics;
  efficiency: LineupEfficiencyMetrics;
  playoffPath: PlayoffPathAnalysis;
  diagnostics: TeamDiagnosticSummary;
};

export const scoreToLetterGrade = (
  score: number
): PositionalGrade["letterGrade"] => {
  if (score >= 94) return "A+";
  if (score >= 88) return "A";
  if (score >= 82) return "A-";
  if (score >= 76) return "B+";
  if (score >= 70) return "B";
  if (score >= 64) return "B-";
  if (score >= 58) return "C+";
  if (score >= 52) return "C";
  if (score >= 46) return "C-";
  if (score >= 40) return "D+";
  if (score >= 34) return "D";
  return "F";
};

export const clamp = (val: number, minVal: number, maxVal: number): number => {
  return Math.min(Math.max(val, minVal), maxVal);
};

interface TeamPositionAccumulator {
  totalPoints: number;
  starterPoints: number;
  benchPoints: number;
  weeksCount: number;
  starters: Map<string, { name: string; points: number; count: number }>;
  bench: Map<string, { name: string; points: number; count: number }>;
}

const normalizePosition = (rawPos: string | undefined | null): PositionKey | null => {
  if (!rawPos) return null;
  const upper = String(rawPos).trim().toUpperCase();
  if (upper === "QB") return "QB";
  if (upper === "RB") return "RB";
  if (upper === "WR") return "WR";
  if (upper === "TE") return "TE";
  if (upper === "K" || upper === "PK") return "K";
  if (upper === "DEF" || upper === "DST" || upper === "D/ST") return "DEF";
  return null;
};

/**
 * Parses weekly starter/bench points by position for all teams.
 */
function extractPositionData(
  allTeams: TableDataType[],
  leagueInfo?: LeagueInfoType
): Map<number, Record<PositionKey, TeamPositionAccumulator>> {
  const teamPosMap = new Map<number, Record<PositionKey, TeamPositionAccumulator>>();

  allTeams.forEach((team) => {
    const initAccumulator = (): Record<PositionKey, TeamPositionAccumulator> => ({
      QB: { totalPoints: 0, starterPoints: 0, benchPoints: 0, weeksCount: 0, starters: new Map(), bench: new Map() },
      RB: { totalPoints: 0, starterPoints: 0, benchPoints: 0, weeksCount: 0, starters: new Map(), bench: new Map() },
      WR: { totalPoints: 0, starterPoints: 0, benchPoints: 0, weeksCount: 0, starters: new Map(), bench: new Map() },
      TE: { totalPoints: 0, starterPoints: 0, benchPoints: 0, weeksCount: 0, starters: new Map(), bench: new Map() },
      K: { totalPoints: 0, starterPoints: 0, benchPoints: 0, weeksCount: 0, starters: new Map(), bench: new Map() },
      DEF: { totalPoints: 0, starterPoints: 0, benchPoints: 0, weeksCount: 0, starters: new Map(), bench: new Map() },
    });

    const teamAcc = initAccumulator();
    const rosterPositions = leagueInfo?.rosterPositions || [];
    const validWeeksCount = team.points ? team.points.filter((p) => typeof p === "number" && p > 0).length : 0;
    const completedWeeks = Math.max(1, validWeeksCount);

    POSITIONS_LIST.forEach((pos) => {
      teamAcc[pos].weeksCount = completedWeeks;
    });

    let hasExtractedStarters = false;

    // 1. Extract from weekly starter arrays if available
    if (team.starterPoints && team.starterPoints.length > 0) {
      team.starterPoints.forEach((weekPoints, weekIdx) => {
        if (!Array.isArray(weekPoints) || weekPoints.length === 0) return;

        const weekStarters = team.starterNames?.[weekIdx] || [];
        const weekStarterIds = team.starters?.[weekIdx] || [];

        weekPoints.forEach((pts, slotIdx) => {
          const numPts = typeof pts === "number" && !isNaN(pts) ? pts : 0;
          let pos: PositionKey | null = null;
          let playerName = `Starter ${slotIdx + 1}`;

          // Check if player object with position exists
          const starterObj = weekStarters[slotIdx];
          if (starterObj && typeof starterObj === "object") {
            const rawPos = (starterObj as any).position;
            pos = normalizePosition(rawPos);
            playerName = (starterObj as any).name || (starterObj as any).first_name
              ? `${(starterObj as any).first_name || ""} ${(starterObj as any).last_name || ""}`.trim() || (starterObj as any).name
              : playerName;
          } else if (typeof starterObj === "string" && starterObj.trim()) {
            playerName = starterObj;
          }

          // Fallback to roster slot definition
          if (!pos && rosterPositions.length > slotIdx) {
            const slot = rosterPositions[slotIdx]?.toUpperCase();
            if (slot === "FLEX" || slot === "SUPER_FLEX" || slot === "WRRB_FLEX" || slot === "REC_FLEX") {
              // Guess from common positions or distribute
              pos = "WR";
            } else {
              pos = normalizePosition(slot);
            }
          }

          const pId = typeof weekStarterIds[slotIdx] === "string" ? weekStarterIds[slotIdx] : undefined;
          const pTeam = starterObj && typeof starterObj === "object" ? (starterObj as any).team : undefined;

          if (pos && teamAcc[pos]) {
            hasExtractedStarters = true;
            teamAcc[pos].starterPoints += numPts;
            teamAcc[pos].totalPoints += numPts;

            const existing = teamAcc[pos].starters.get(playerName) || { playerId: pId, name: playerName, team: pTeam, points: 0, count: 0 };
            if (!existing.playerId && pId) existing.playerId = pId;
            if (!existing.team && pTeam) existing.team = pTeam;
            existing.points += numPts;
            existing.count += 1;
            teamAcc[pos].starters.set(playerName, existing);
          }
        });
      });
    }

    // 2. Extract bench points if available
    if (team.benchPoints && team.benchPoints.length > 0) {
      team.benchPoints.forEach((weekBenchPts, weekIdx) => {
        if (!Array.isArray(weekBenchPts)) return;
        const weekBenchNames = team.benchNames?.[weekIdx] || [];

        weekBenchPts.forEach((pts, slotIdx) => {
          const numPts = typeof pts === "number" && !isNaN(pts) ? pts : 0;
          let pos: PositionKey | null = null;
          let playerName = `Bench ${slotIdx + 1}`;

          const benchObj = weekBenchNames[slotIdx];
          if (benchObj && typeof benchObj === "object") {
            pos = normalizePosition((benchObj as any).position);
            playerName = (benchObj as any).name || (benchObj as any).first_name
              ? `${(benchObj as any).first_name || ""} ${(benchObj as any).last_name || ""}`.trim() || (benchObj as any).name
              : playerName;
          } else if (typeof benchObj === "string" && benchObj.trim()) {
            playerName = benchObj;
          }

          const pTeam = benchObj && typeof benchObj === "object" ? (benchObj as any).team : undefined;

          if (pos && teamAcc[pos]) {
            teamAcc[pos].benchPoints += numPts;
            const existing = teamAcc[pos].bench.get(playerName) || { name: playerName, team: pTeam, points: 0, count: 0 };
            if (!existing.team && pTeam) existing.team = pTeam;
            existing.points += numPts;
            existing.count += 1;
            teamAcc[pos].bench.set(playerName, existing);
          }
        });
      });
    }

    // 3. Fallback: check rosterRankings if starterPoints was empty
    if (!hasExtractedStarters && leagueInfo?.rosterRankings?.[team.rosterId]) {
      const playerList = leagueInfo.rosterRankings[team.rosterId];
      if (Array.isArray(playerList)) {
        playerList.forEach((player) => {
          const pos = normalizePosition(player.position);
          if (pos && teamAcc[pos]) {
            hasExtractedStarters = true;
            const pts = Number(player.points || 0);
            teamAcc[pos].starterPoints += pts;
            teamAcc[pos].totalPoints += pts;
            const pName = `${player.firstName || ""} ${player.lastName || ""}`.trim() || player.id;
            teamAcc[pos].starters.set(pName, { name: pName, points: pts, count: 1 });
          }
        });
      }
    }

    // 4. Default fallback: synthesize standard positional proportion based on team.pointsFor
    if (!hasExtractedStarters && team.pointsFor > 0) {
      const proportions: Record<PositionKey, number> = {
        QB: 0.20,
        RB: 0.32,
        WR: 0.32,
        TE: 0.08,
        K: 0.04,
        DEF: 0.04,
      };

      POSITIONS_LIST.forEach((pos) => {
        const pts = team.pointsFor * proportions[pos];
        teamAcc[pos].starterPoints = pts;
        teamAcc[pos].totalPoints = pts;
        teamAcc[pos].starters.set(`${pos} Group`, { name: `${pos} Group`, points: pts, count: completedWeeks });
      });
    }

    teamPosMap.set(team.rosterId, teamAcc);
  });

  return teamPosMap;
}

/**
 * Computes Positional Strength Grades for all positions.
 */
export function computePositionalGrades(
  targetTeam: TableDataType,
  allTeams: TableDataType[],
  leagueInfo?: LeagueInfoType
): Record<PositionKey, PositionalGrade> {
  const positionData = extractPositionData(allTeams, leagueInfo);
  const targetAcc = positionData.get(targetTeam.rosterId);

  // Compute league-wide stats per position
  const leaguePosStats: Record<
    PositionKey,
    { ppgList: number[]; avgPpg: number; maxPpg: number; minPpg: number; stdDev: number }
  > = {
    QB: { ppgList: [], avgPpg: 0, maxPpg: 0, minPpg: 0, stdDev: 0 },
    RB: { ppgList: [], avgPpg: 0, maxPpg: 0, minPpg: 0, stdDev: 0 },
    WR: { ppgList: [], avgPpg: 0, maxPpg: 0, minPpg: 0, stdDev: 0 },
    TE: { ppgList: [], avgPpg: 0, maxPpg: 0, minPpg: 0, stdDev: 0 },
    K: { ppgList: [], avgPpg: 0, maxPpg: 0, minPpg: 0, stdDev: 0 },
    DEF: { ppgList: [], avgPpg: 0, maxPpg: 0, minPpg: 0, stdDev: 0 },
  };

  POSITIONS_LIST.forEach((pos) => {
    const list: number[] = [];
    allTeams.forEach((team) => {
      const acc = positionData.get(team.rosterId)?.[pos];
      const ppg = acc ? acc.starterPoints / Math.max(1, acc.weeksCount) : 0;
      list.push(ppg);
    });
    leaguePosStats[pos].ppgList = list;
    leaguePosStats[pos].avgPpg = mean(list);
    leaguePosStats[pos].maxPpg = max(list) ?? 1;
    leaguePosStats[pos].minPpg = min(list) ?? 0;
    leaguePosStats[pos].stdDev = standardDeviation(list);
  });

  const result: Partial<Record<PositionKey, PositionalGrade>> = {};

  POSITIONS_LIST.forEach((pos) => {
    const acc = targetAcc?.[pos];
    const totalPts = acc ? acc.starterPoints : 0;
    const weeksCount = acc ? Math.max(1, acc.weeksCount) : 1;
    const teamPpg = totalPts / weeksCount;
    const benchPts = acc ? acc.benchPoints : 0;
    const benchAvg = benchPts / weeksCount;

    const { avgPpg, maxPpg, stdDev } = leaguePosStats[pos];

    // Compute rank
    const sortedPpg = [...leaguePosStats[pos].ppgList].sort((a, b) => b - a);
    const rank = Math.max(1, sortedPpg.findIndex((p) => p <= teamPpg) + 1);

    // Compute 0-100 Score
    let score = 50;
    if (stdDev > 0.01) {
      const zScore = (teamPpg - avgPpg) / stdDev;
      score = Math.round(50 + zScore * 18);
    } else if (maxPpg > 0) {
      score = Math.round((teamPpg / maxPpg) * 80 + 10);
    }
    score = clamp(score, 15, 99);

    const letterGrade = scoreToLetterGrade(score);

    let tier: PositionalGrade["tier"] = "Average";
    if (score >= 86) tier = "Elite";
    else if (score >= 72) tier = "Strong";
    else if (score >= 54) tier = "Average";
    else if (score >= 40) tier = "Vulnerable";
    else tier = "Critical Need";

    const keyStarters = acc
      ? Array.from(acc.starters.values())
          .sort((a, b) => b.points - a.points)
          .slice(0, 4)
          .map((s) => ({
            playerId: s.playerId,
            name: s.name,
            team: s.team,
            points: Number(s.points.toFixed(1)),
            ppg: Number((s.points / Math.max(1, s.count)).toFixed(1)),
          }))
      : [];

    const keyBench = acc
      ? Array.from(acc.bench.values())
          .sort((a, b) => b.points - a.points)
          .slice(0, 3)
          .map((b) => ({
            playerId: b.playerId,
            name: b.name,
            team: b.team,
            points: Number(b.points.toFixed(1)),
            ppg: Number((b.points / Math.max(1, b.count)).toFixed(1)),
          }))
      : [];

    result[pos] = {
      position: pos,
      score,
      letterGrade,
      rank,
      totalPoints: Number(totalPts.toFixed(1)),
      ppg: Number(teamPpg.toFixed(1)),
      starterAvg: Number(teamPpg.toFixed(1)),
      benchAvg: Number(benchAvg.toFixed(1)),
      leagueAvgPpg: Number(avgPpg.toFixed(1)),
      leagueMaxPpg: Number(maxPpg.toFixed(1)),
      tier,
      keyStarters,
      keyBench,
    };
  });

  return result as Record<PositionKey, PositionalGrade>;
}

/**
 * Computes Luck Rating and Schedule Variance.
 */
export function computeLuckAnalysis(
  targetTeam: TableDataType,
  allTeams: TableDataType[]
): LuckAnalysis {
  const actualWins = targetTeam.wins;
  const completedWeeks = targetTeam.points
    ? targetTeam.points.filter((p) => typeof p === "number" && p > 0).length
    : 1;

  const expectedWins =
    typeof targetTeam.randomScheduleWins === "number" && !isNaN(targetTeam.randomScheduleWins)
      ? Number(targetTeam.randomScheduleWins.toFixed(1))
      : targetTeam.winsAgainstAll + targetTeam.lossesAgainstAll > 0
        ? Number(
            (
              (targetTeam.winsAgainstAll /
                (targetTeam.winsAgainstAll + targetTeam.lossesAgainstAll)) *
              completedWeeks
            ).toFixed(1)
          )
        : actualWins;

  const luckDelta = Number((actualWins - expectedWins).toFixed(1));

  const pointsAgainst = targetTeam.pointsAgainst;
  const allPA = allTeams.map((t) => t.pointsAgainst);
  const leagueAvgPointsAgainst = Number(mean(allPA).toFixed(1));
  const pointsAgainstDiff = Number((pointsAgainst - leagueAvgPointsAgainst).toFixed(1));

  const sortedPA = [...allPA].sort((a, b) => b - a);
  const pointsAgainstRank = Math.max(1, sortedPA.indexOf(pointsAgainst) + 1);

  const totalTeams = Math.max(1, allTeams.length);
  const paPercentile = (totalTeams - pointsAgainstRank) / totalTeams;

  let scheduleDifficulty: LuckAnalysis["scheduleDifficulty"] = "Average";
  if (pointsAgainstRank <= Math.ceil(totalTeams * 0.2)) {
    scheduleDifficulty = "Brutal";
  } else if (pointsAgainstRank <= Math.ceil(totalTeams * 0.4)) {
    scheduleDifficulty = "Tough";
  } else if (pointsAgainstRank <= Math.ceil(totalTeams * 0.6)) {
    scheduleDifficulty = "Average";
  } else if (pointsAgainstRank <= Math.ceil(totalTeams * 0.8)) {
    scheduleDifficulty = "Favorable";
  } else {
    scheduleDifficulty = "Cake Walk";
  }

  let luckGrade: LuckAnalysis["luckGrade"] = "Neutral";
  if (luckDelta >= 1.8) luckGrade = "Luck God";
  else if (luckDelta >= 0.7) luckGrade = "Fortunate";
  else if (luckDelta >= -0.7) luckGrade = "Neutral";
  else if (luckDelta >= -1.8) luckGrade = "Unlucky";
  else luckGrade = "Snakebitten";

  // Score 0-100 (50 is neutral, >50 is lucky, <50 is unlucky)
  const luckScore = clamp(
    Math.round(50 + luckDelta * 14 - (pointsAgainstDiff / (leagueAvgPointsAgainst * 0.08 || 1)) * 5),
    5,
    98
  );

  let explanation = "";
  if (luckDelta >= 1.0 && pointsAgainstDiff < 0) {
    explanation = `Major beneficiary of schedule variance: +${luckDelta} wins over expected while facing ${Math.abs(pointsAgainstDiff)} fewer points against than league average.`;
  } else if (luckDelta <= -1.0 && pointsAgainstDiff > 0) {
    explanation = `Significantly snakebitten: -${Math.abs(luckDelta)} wins below expected while running into the #${pointsAgainstRank} toughest scoring schedule (+${pointsAgainstDiff} PA vs avg).`;
  } else if (luckDelta >= 0.5) {
    explanation = `Positive win luck with +${luckDelta} wins gained from favorable matchup timing.`;
  } else if (luckDelta <= -0.5) {
    explanation = `Slightly hard-luck season with ${Math.abs(luckDelta)} wins lost despite competitive scoring output.`;
  } else {
    explanation = `Record matches scoring output very closely (${actualWins} actual vs ${expectedWins} expected wins).`;
  }

  return {
    actualWins,
    expectedWins,
    luckDelta,
    luckGrade,
    pointsAgainst: Number(pointsAgainst.toFixed(1)),
    leagueAvgPointsAgainst,
    pointsAgainstDiff,
    pointsAgainstRank,
    scheduleDifficulty,
    luckScore,
    explanation,
  };
}

/**
 * Computes Scoring Consistency & Volatility Metrics.
 */
export function computeConsistencyMetrics(
  targetTeam: TableDataType,
  allTeams: TableDataType[]
): ConsistencyMetrics {
  const scores = (targetTeam.points || []).filter(
    (p): p is number => typeof p === "number" && !isNaN(p) && p > 0
  );

  if (scores.length === 0) {
    return {
      averageScore: 0,
      medianScore: 0,
      standardDeviation: 0,
      ceiling: 0,
      floor: 0,
      range: 0,
      coefficientOfVariation: 0,
      volatilityLabel: "Rock Solid",
      boomWeeks: 0,
      bustWeeks: 0,
      neutralWeeks: 0,
      weeklyScores: [],
      trend: "Steady",
      trendDelta: 0,
    };
  }

  const averageScore = Number(mean(scores).toFixed(1));
  const medianScore = Number((getMedian(scores) ?? averageScore).toFixed(1));
  const stdDev = Number(standardDeviation(scores).toFixed(1));
  const ceiling = Number((max(scores) ?? 0).toFixed(1));
  const floor = Number((min(scores) ?? 0).toFixed(1));
  const range = Number((ceiling - floor).toFixed(1));
  const cv = averageScore > 0 ? Number(((stdDev / averageScore) * 100).toFixed(1)) : 0;

  let volatilityLabel: ConsistencyMetrics["volatilityLabel"] = "Moderately Consistent";
  if (cv < 11) volatilityLabel = "Rock Solid";
  else if (cv < 17) volatilityLabel = "Moderately Consistent";
  else if (cv < 24) volatilityLabel = "High Volatility";
  else volatilityLabel = "Wild Rollercoaster";

  // Build weekly scores breakdown with league median and boom/bust flags
  const weeklyScores: WeeklyScoreDetail[] = [];
  let boomWeeks = 0;
  let bustWeeks = 0;
  let neutralWeeks = 0;

  scores.forEach((score, index) => {
    const weekNum = index + 1;
    // Calculate league median for this week
    const weekLeagueScores = allTeams
      .map((t) => t.points?.[index])
      .filter((p): p is number => typeof p === "number" && p > 0);
    const leagueMedian = Number((getMedian(weekLeagueScores) ?? averageScore).toFixed(1));

    // Determine result
    let result: WeeklyScoreDetail["result"] = "-";
    const recordChar = targetTeam.recordByWeek?.[index];
    if (recordChar === "W" || recordChar === "L" || recordChar === "T") {
      result = recordChar;
    }

    // Opponent score
    const matchupId = targetTeam.matchups?.[index];
    let opponentScore: number | undefined;
    let opponentName: string | undefined;

    if (matchupId != null) {
      const opp = allTeams.find(
        (t) => t.rosterId !== targetTeam.rosterId && t.matchups?.[index] === matchupId
      );
      if (opp) {
        opponentScore = opp.points?.[index];
        opponentName = opp.name || opp.username || `Team ${opp.rosterId}`;
        if (result === "-" && opponentScore != null) {
          if (score > opponentScore) result = "W";
          else if (score < opponentScore) result = "L";
          else result = "T";
        }
      }
    }

    const isBoom = score >= averageScore * 1.14 || score >= ceiling * 0.95;
    const isBust = score <= averageScore * 0.86 || score <= floor * 1.05;

    if (isBoom) boomWeeks++;
    else if (isBust) bustWeeks++;
    else neutralWeeks++;

    weeklyScores.push({
      week: weekNum,
      score: Number(score.toFixed(1)),
      leagueMedian,
      result,
      opponentScore: opponentScore != null ? Number(opponentScore.toFixed(1)) : undefined,
      opponentName,
      isBoom,
      isBust,
    });
  });

  // Calculate recent trend (last 3 weeks vs full season avg)
  let trend: ConsistencyMetrics["trend"] = "Steady";
  let trendDelta = 0;
  if (scores.length >= 3) {
    const last3 = scores.slice(-3);
    const last3Avg = mean(last3);
    trendDelta = Number((last3Avg - averageScore).toFixed(1));
    if (trendDelta >= 6.0) trend = "Trending Up";
    else if (trendDelta <= -6.0) trend = "Trending Down";
  }

  return {
    averageScore,
    medianScore,
    standardDeviation: stdDev,
    ceiling,
    floor,
    range,
    coefficientOfVariation: cv,
    volatilityLabel,
    boomWeeks,
    bustWeeks,
    neutralWeeks,
    weeklyScores,
    trend,
    trendDelta,
  };
}

/**
 * Computes Lineup Efficiency and Roster Depth Diagnostics.
 */
export function computeEfficiencyMetrics(
  targetTeam: TableDataType,
  allTeams: TableDataType[]
): LineupEfficiencyMetrics {
  const actualPoints = Number(targetTeam.pointsFor.toFixed(1));
  const potentialPoints = Number(
    (targetTeam.potentialPoints > 0 ? targetTeam.potentialPoints : actualPoints).toFixed(1)
  );

  const efficiencyPercentage =
    targetTeam.managerEfficiency > 0
      ? Number((targetTeam.managerEfficiency * 100).toFixed(1))
      : potentialPoints > 0
        ? Number(((actualPoints / potentialPoints) * 100).toFixed(1))
        : 100;

  const pointsLeftOnBench = Number(Math.max(0, potentialPoints - actualPoints).toFixed(1));
  const completedWeeks = targetTeam.points
    ? targetTeam.points.filter((p) => typeof p === "number" && p > 0).length
    : 1;
  const pointsLeftOnBenchPerWeek = Number(
    (pointsLeftOnBench / Math.max(1, completedWeeks)).toFixed(1)
  );

  // Efficiency Rank in league
  const sortedEff = [...allTeams].sort((a, b) => b.managerEfficiency - a.managerEfficiency);
  const efficiencyRank = Math.max(
    1,
    sortedEff.findIndex((t) => t.rosterId === targetTeam.rosterId) + 1
  );

  let efficiencyGrade = "B";
  if (efficiencyPercentage >= 91) efficiencyGrade = "A+";
  else if (efficiencyPercentage >= 87) efficiencyGrade = "A";
  else if (efficiencyPercentage >= 83) efficiencyGrade = "B+";
  else if (efficiencyPercentage >= 78) efficiencyGrade = "B";
  else if (efficiencyPercentage >= 73) efficiencyGrade = "C+";
  else if (efficiencyPercentage >= 68) efficiencyGrade = "C";
  else efficiencyGrade = "D";

  // Calculate Bench Points
  let benchPointsTotal = 0;
  if (targetTeam.benchPoints && targetTeam.benchPoints.length > 0) {
    targetTeam.benchPoints.forEach((w) => {
      if (Array.isArray(w)) benchPointsTotal += sum(w.filter((p) => typeof p === "number"));
    });
  } else {
    benchPointsTotal = pointsLeftOnBench * 1.5;
  }
  benchPointsTotal = Number(benchPointsTotal.toFixed(1));
  const benchPointsAvg = Number((benchPointsTotal / Math.max(1, completedWeeks)).toFixed(1));

  // Roster Depth Score (0-100)
  const rosterDepthScore = clamp(
    Math.round(benchPointsAvg * 1.6 + (100 - pointsLeftOnBenchPerWeek * 1.8) * 0.3),
    15,
    98
  );

  // Starter Reliability Index (0-100)
  const starterReliabilityIndex = clamp(
    Math.round(efficiencyPercentage * 0.8 + (100 - pointsLeftOnBenchPerWeek * 2) * 0.2),
    20,
    99
  );

  return {
    actualPoints,
    potentialPoints,
    efficiencyPercentage,
    pointsLeftOnBench,
    pointsLeftOnBenchPerWeek,
    efficiencyRank,
    efficiencyGrade,
    benchPointsTotal,
    benchPointsAvg,
    rosterDepthScore,
    starterReliabilityIndex,
  };
}

/**
 * Computes Playoff Path & Remaining Schedule Analysis.
 */
export function computePlayoffPath(
  targetTeam: TableDataType,
  allTeams: TableDataType[],
  leagueInfo?: LeagueInfoType
): PlayoffPathAnalysis {
  const currentRank = targetTeam.regularSeasonRank || 1;
  const currentRecord = `${targetTeam.wins}-${targetTeam.losses}${
    targetTeam.ties ? `-${targetTeam.ties}` : ""
  }`;
  const totalTeams = allTeams.length;
  const playoffTeams = leagueInfo?.playoffTeams || (totalTeams <= 10 ? 4 : 6);
  const regularSeasonLength = leagueInfo?.regularSeasonLength || 14;
  const completedWeeks = targetTeam.points
    ? targetTeam.points.filter((p) => typeof p === "number" && p > 0).length
    : targetTeam.wins + targetTeam.losses;

  // Playoff probability extraction or heuristic calculation
  let playoffProbability = 50;
  let projectedWinsTotal = targetTeam.wins;

  const proj = leagueInfo?.playoffProjections?.find(
    (p) => p.id === targetTeam.id || p.name === targetTeam.name
  );

  if (proj) {
    playoffProbability =
      proj.playoffPercentage > 100
        ? Number(((proj.playoffPercentage / 2000) * 100).toFixed(1))
        : Number(proj.playoffPercentage.toFixed(1));
    projectedWinsTotal = Number(proj.projectedWinsTotal?.toFixed(1) || targetTeam.wins);
  } else {
    // Heuristic simulation estimation
    const remainingGames = Math.max(0, regularSeasonLength - completedWeeks);
    const winRate =
      completedWeeks > 0 ? targetTeam.wins / completedWeeks : 0.5;
    projectedWinsTotal = Number((targetTeam.wins + remainingGames * winRate).toFixed(1));

    if (remainingGames === 0) {
      playoffProbability = currentRank <= playoffTeams ? 100 : 0;
    } else {
      const estimatedPlayoffCutWins = regularSeasonLength * 0.53;
      const margin = projectedWinsTotal - estimatedPlayoffCutWins;
      playoffProbability = clamp(Math.round(50 + margin * 28), 2, 99);
    }
  }

  let clinchStatus: PlayoffPathAnalysis["clinchStatus"] = "In the Hunt";
  if (playoffProbability >= 99) clinchStatus = "Clinched";
  else if (playoffProbability >= 75) clinchStatus = "High Odds";
  else if (playoffProbability >= 45) clinchStatus = "In the Hunt";
  else if (playoffProbability >= 20) clinchStatus = "Bubble Team";
  else if (playoffProbability > 0) clinchStatus = "Longshot";
  else clinchStatus = "Eliminated";

  // Remaining Opponents Analysis
  const remainingOpponents: RemainingOpponent[] = [];
  const leagueAvgPpg =
    allTeams.length > 0
      ? mean(allTeams.map((t) => t.pointsFor / Math.max(1, completedWeeks)))
      : 100;

  for (let w = completedWeeks; w < regularSeasonLength; w++) {
    const weekNum = w + 1;
    const matchupId = targetTeam.matchups?.[w];
    if (matchupId != null) {
      const opp = allTeams.find(
        (t) => t.rosterId !== targetTeam.rosterId && t.matchups?.[w] === matchupId
      );
      if (opp) {
        const oppCompleted = opp.points ? opp.points.filter((p) => p > 0).length : 1;
        const oppAvgPpg = Number((opp.pointsFor / Math.max(1, oppCompleted)).toFixed(1));
        const oppRecord = `${opp.wins}-${opp.losses}${opp.ties ? `-${opp.ties}` : ""}`;

        let diff: RemainingOpponent["difficulty"] = "Neutral";
        if (oppAvgPpg >= leagueAvgPpg * 1.05 || opp.regularSeasonRank <= Math.ceil(totalTeams * 0.25)) {
          diff = "Hard";
        } else if (
          oppAvgPpg <= leagueAvgPpg * 0.95 ||
          opp.regularSeasonRank >= Math.floor(totalTeams * 0.75)
        ) {
          diff = "Easy";
        }

        remainingOpponents.push({
          week: weekNum,
          opponentName: opp.name || opp.username || `Team ${opp.rosterId}`,
          opponentUsername: opp.username,
          opponentRecord: oppRecord,
          opponentRank: opp.regularSeasonRank || 0,
          opponentAvgPpg: oppAvgPpg,
          difficulty: diff,
        });
      }
    }
  }

  // Schedule strength calculation
  let remainingScheduleStrength: PlayoffPathAnalysis["remainingScheduleStrength"] = "Moderate";
  if (remainingOpponents.length > 0) {
    const hardCount = remainingOpponents.filter((o) => o.difficulty === "Hard").length;
    const easyCount = remainingOpponents.filter((o) => o.difficulty === "Easy").length;
    if (hardCount >= remainingOpponents.length * 0.6) {
      remainingScheduleStrength = "Nightmare";
    } else if (hardCount > easyCount) {
      remainingScheduleStrength = "Difficult";
    } else if (easyCount > hardCount) {
      remainingScheduleStrength = "Easy";
    }
  }

  const magicNumber = Math.max(0, Math.ceil(regularSeasonLength * 0.58) - targetTeam.wins);

  return {
    currentRank,
    currentRecord,
    playoffProbability,
    playoffTeams,
    totalTeams,
    projectedWinsTotal,
    clinchStatus,
    remainingOpponents,
    remainingScheduleStrength,
    magicNumber: magicNumber > 0 ? magicNumber : undefined,
  };
}

/**
 * Generates automated narrative diagnostics, strengths, weaknesses, and actionable recommendations.
 */
export function generateTeamDiagnostics(
  team: TableDataType,
  allTeams: TableDataType[],
  positionalGrades: Record<PositionKey, PositionalGrade>,
  luck: LuckAnalysis,
  consistency: ConsistencyMetrics,
  efficiency: LineupEfficiencyMetrics,
  playoffPath: PlayoffPathAnalysis
): TeamDiagnosticSummary {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const rosterAlerts: RosterAlert[] = [];

  // Sort positions by score descending
  const sortedPositions = POSITIONS_LIST.map((pos) => positionalGrades[pos]).sort(
    (a, b) => b.score - a.score
  );

  const topPos1 = sortedPositions[0];
  const topPos2 = sortedPositions[1];
  const botPos1 = sortedPositions[sortedPositions.length - 1];
  const botPos2 = sortedPositions[sortedPositions.length - 2];

  // Power rank calculation
  const sortedRating = [...allTeams].sort((a, b) => (b.rating || b.pointsFor) - (a.rating || a.pointsFor));
  const powerRank = Math.max(1, sortedRating.findIndex((t) => t.rosterId === team.rosterId) + 1);

  // Overall rating 0-100
  const overallRating = clamp(
    Math.round(
      (mean(sortedPositions.map((p) => p.score)) * 0.45) +
      (efficiency.efficiencyPercentage * 0.25) +
      (playoffPath.playoffProbability * 0.20) +
      (100 - consistency.coefficientOfVariation * 1.5) * 0.10
    ),
    20,
    99
  );

  // Strengths
  if (topPos1 && topPos1.score >= 70) {
    strengths.push(
      `Powerhouse ${topPos1.position} corps (Grade: ${topPos1.letterGrade}, #${topPos1.rank} in league) generating ${topPos1.ppg} PPG.`
    );
  }
  if (topPos2 && topPos2.score >= 65) {
    strengths.push(
      `Strong ${topPos2.position} production providing consistent weekly baseline (${topPos2.ppg} PPG).`
    );
  }
  if (efficiency.efficiencyPercentage >= 84) {
    strengths.push(
      `Elite lineup management: ${efficiency.efficiencyPercentage}% efficiency (#${efficiency.efficiencyRank} in league), leaving only ${efficiency.pointsLeftOnBenchPerWeek} pts/week on bench.`
    );
  }
  if (consistency.volatilityLabel === "Rock Solid" || consistency.volatilityLabel === "Moderately Consistent") {
    strengths.push(
      `High weekly scoring floor (${consistency.floor} pts) with low volatility (CV: ${consistency.coefficientOfVariation}%).`
    );
  }
  if (luck.luckDelta >= 1.0) {
    strengths.push(
      `Capitalizing on favorable game situations (+${luck.luckDelta} wins above expected).`
    );
  }
  if (strengths.length < 2) {
    strengths.push(`Competitive total scoring (${team.pointsFor} points for across regular season).`);
  }

  // Weaknesses
  if (botPos1 && botPos1.score <= 55) {
    weaknesses.push(
      `Deficit at ${botPos1.position} (Grade: ${botPos1.letterGrade}, #${botPos1.rank} in league) lagging behind league average by ${Math.abs(
        Number((botPos1.leagueAvgPpg - botPos1.ppg).toFixed(1))
      )} PPG.`
    );
  }
  if (botPos2 && botPos2.score <= 60 && botPos2.position !== botPos1.position) {
    weaknesses.push(
      `Inconsistent output at ${botPos2.position} (${botPos2.ppg} PPG vs ${botPos2.leagueAvgPpg} league avg).`
    );
  }
  if (efficiency.pointsLeftOnBenchPerWeek >= 18) {
    weaknesses.push(
      `Suboptimal start/sit decisions leaving ${efficiency.pointsLeftOnBenchPerWeek} points per week unused on the bench.`
    );
  }
  if (consistency.coefficientOfVariation >= 20) {
    weaknesses.push(
      `High scoring volatility (Spread: ${consistency.range} pts between ${consistency.ceiling} ceiling and ${consistency.floor} floor).`
    );
  }
  if (playoffPath.remainingScheduleStrength === "Difficult" || playoffPath.remainingScheduleStrength === "Nightmare") {
    weaknesses.push(
      `Challenging remaining stretch against top-scoring league contenders.`
    );
  }
  if (weaknesses.length < 2) {
    weaknesses.push(`Minor depth vulnerability if primary starters miss time.`);
  }

  // Actionable Recommendations
  if (topPos1 && botPos1 && topPos1.score >= 75 && botPos1.score <= 55) {
    recommendations.push(
      `Package surplus ${topPos1.position} depth in a 2-for-1 trade to upgrade your starting ${botPos1.position} slot.`
    );
  } else if (botPos1 && botPos1.score <= 55) {
    recommendations.push(
      `Aggressively target waiver wire priority and trade market for starting caliber ${botPos1.position} options.`
    );
  }

  if (efficiency.pointsLeftOnBenchPerWeek >= 15) {
    recommendations.push(
      `Re-evaluate weekly flex matchups and projection variance to capture bench ceiling points.`
    );
  }

  if (positionalGrades.K.score < 55 || positionalGrades.DEF.score < 55) {
    recommendations.push(
      `Stream Kicker and Defense matchups based on opposing defense metrics and projected high-volume game environments.`
    );
  }

  if (playoffPath.playoffProbability >= 70) {
    recommendations.push(
      `Stash high-upside backup running backs and scout playoff weeks (15-17) defensive schedule matchups.`
    );
  } else {
    recommendations.push(
      `Adopt a win-now posture: play highest weekly ceiling assets and utilize aggressive waiver bids.`
    );
  }

  // Roster Alerts
  if (botPos1 && botPos1.tier === "Critical Need") {
    rosterAlerts.push({
      type: "warning",
      title: `Critical Need at ${botPos1.position}`,
      description: `Ranks #${botPos1.rank} across the league. Significant weekly matchup disadvantage.`,
      playerPosition: botPos1.position,
    });
  }

  if (topPos1 && topPos1.score >= 85 && topPos1.keyStarters?.[0]) {
    const topProducer = topPos1.keyStarters[0];
    rosterAlerts.push({
      type: "success",
      title: `Elite Production Core (${topPos1.position})`,
      description: `Led by ${topProducer.name} (${topProducer.points} pts), yielding #${topPos1.rank} position ranking in league.`,
      playerId: topProducer.playerId,
      playerName: topProducer.name,
      playerPosition: topPos1.position,
      playerTeam: topProducer.team,
    });
  }

  if (efficiency.pointsLeftOnBenchPerWeek >= 20) {
    rosterAlerts.push({
      type: "warning",
      title: `High Bench Bleed (${efficiency.pointsLeftOnBenchPerWeek} PPG)`,
      description: `Frequent starter misfires are costing valuable win margin every matchup.`,
    });
  }

  if (consistency.boomWeeks >= 3) {
    rosterAlerts.push({
      type: "success",
      title: `High Ceiling Alert (${consistency.boomWeeks} Boom Weeks)`,
      description: `Demonstrated championship-caliber upside capable of beating any league opponent.`,
    });
  }

  if (playoffPath.clinchStatus === "Clinched" || playoffPath.clinchStatus === "High Odds") {
    rosterAlerts.push({
      type: "info",
      title: `Strong Playoff Trajectory (${playoffPath.playoffProbability}%)`,
      description: `In prime position for the postseason bracket. Focus on late-season roster fortification.`,
    });
  }

  // AI Team Outlook Narrative
  const teamName = team.name || team.username || `Team ${team.rosterId}`;
  const outlook = `${teamName} enters the stretch run with an overall power rating of ${overallRating}/100 (#${powerRank} in power rank) and a ${playoffPath.currentRecord} record. Powered by a ${topPos1.letterGrade} grade at ${topPos1.position}, the team boasts a ${consistency.volatilityLabel.toLowerCase()} scoring profile averaging ${consistency.averageScore} PPG. ${
    playoffPath.playoffProbability >= 70
      ? `Postseason prospects are outstanding at ${playoffPath.playoffProbability}% probability.`
      : `Currently on the playoff bubble (${playoffPath.playoffProbability}% odds), where addressing ${botPos1.position} will be pivotal.`
  } Lineup management has been ${efficiency.efficiencyPercentage >= 80 ? "crisp" : "serviceable"} at ${efficiency.efficiencyPercentage}% efficiency.`;

  return {
    overallRating,
    powerRank,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
    aiOutlook: outlook,
    rosterAlerts,
  };
}

/**
 * Master analyzer function computing the full deep dive diagnostic for a manager.
 */
export function analyzeTeam(
  targetTeam: TableDataType,
  allTeams: TableDataType[],
  leagueInfo?: LeagueInfoType
): FullTeamAnalysis {
  const positionalGrades = computePositionalGrades(targetTeam, allTeams, leagueInfo);
  const luck = computeLuckAnalysis(targetTeam, allTeams);
  const consistency = computeConsistencyMetrics(targetTeam, allTeams);
  const efficiency = computeEfficiencyMetrics(targetTeam, allTeams);
  const playoffPath = computePlayoffPath(targetTeam, allTeams, leagueInfo);
  const diagnostics = generateTeamDiagnostics(
    targetTeam,
    allTeams,
    positionalGrades,
    luck,
    consistency,
    efficiency,
    playoffPath
  );

  const radarCategories: PositionKey[] = ["QB", "RB", "WR", "TE", "K", "DEF"];
  const radarTeamScores = radarCategories.map((pos) => positionalGrades[pos]?.score || 50);
  const radarLeagueAverages = radarCategories.map(() => 50);

  return {
    team: targetTeam,
    positionalGrades,
    positionalRadarData: {
      categories: radarCategories,
      teamScores: radarTeamScores,
      leagueAverages: radarLeagueAverages,
    },
    luck,
    consistency,
    efficiency,
    playoffPath,
    diagnostics,
  };
}
