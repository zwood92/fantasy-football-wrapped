import { describe, expect, it } from "vitest";
import {
  analyzeTeam,
  clamp,
  computeConsistencyMetrics,
  computeEfficiencyMetrics,
  computeLuckAnalysis,
  computePlayoffPath,
  computePositionalGrades,
  generateTeamDiagnostics,
  POSITIONS_LIST,
  scoreToLetterGrade,
  type PositionKey,
} from "../src/lib/teamAnalysisEngine";
import type { LeagueInfoType, TableDataType } from "../src/types/types";

describe("teamAnalysisEngine", () => {
  const createMockTeam = (
    rosterId: number,
    name: string,
    wins: number,
    losses: number,
    points: number[],
    options: Partial<TableDataType> = {}
  ): TableDataType => {
    const pointsFor = points.reduce((a, b) => a + b, 0);
    return {
      id: `user-${rosterId}`,
      rosterId,
      name,
      username: name.toLowerCase().replace(/\s+/g, "_"),
      wins,
      losses,
      ties: 0,
      pointsFor,
      pointsAgainst: 1200 + rosterId * 20,
      winsAgainstAll: wins * 8,
      lossesAgainstAll: losses * 8,
      winsWithMedian: wins + 2,
      lossesWithMedian: losses + 2,
      headToHeadWins: wins,
      headToHeadLosses: losses,
      headToHeadTies: 0,
      rating: 80 + wins * 2,
      randomScheduleWins: wins + 0.5,
      avatarImg: "",
      points,
      matchups: points.map((_, i) => ((i + rosterId) % 4) + 1),
      potentialPoints: pointsFor * 1.15,
      managerEfficiency: 1 / 1.15,
      regularSeasonRank: 13 - wins,
      expectedWinsSTD: 1.2,
      recordByWeek: Array(points.length).fill(wins > losses ? "W" : "L").join(""),
      players: [`p-${rosterId}-1`, `p-${rosterId}-2`, `p-${rosterId}-3`, `p-${rosterId}-4`, `p-${rosterId}-5`, `p-${rosterId}-6`],
      starters: points.map(() => [`p-${rosterId}-1`, `p-${rosterId}-2`, `p-${rosterId}-3`, `p-${rosterId}-4`, `p-${rosterId}-5`, `p-${rosterId}-6`]),
      starterPoints: points.map((p) => [p * 0.25, p * 0.25, p * 0.25, p * 0.15, p * 0.05, p * 0.05]),
      starterNames: points.map(() => [
        { first_name: "Josh", last_name: "Allen", position: "QB", player_id: "1", team: "BUF" },
        { first_name: "Christian", last_name: "McCaffrey", position: "RB", player_id: "2", team: "SF" },
        { first_name: "Justin", last_name: "Jefferson", position: "WR", player_id: "3", team: "MIN" },
        { first_name: "Travis", last_name: "Kelce", position: "TE", player_id: "4", team: "KC" },
        { first_name: "Justin", last_name: "Tucker", position: "K", player_id: "5", team: "BAL" },
        { name: "San Francisco 49ers", position: "DEF", player_id: "6", team: "SF" },
      ]),
      benchPlayers: points.map(() => [`p-${rosterId}-b1`, `p-${rosterId}-b2`]),
      benchPoints: points.map(() => [14.2, 8.5]),
      benchNames: points.map(() => [
        { first_name: "Tyler", last_name: "Lockett", position: "WR", player_id: "7", team: "SEA" },
        { first_name: "Zach", last_name: "Charbonnet", position: "RB", player_id: "8", team: "SEA" },
      ]),
      ...options,
    };
  };

  const teamA = createMockTeam(1, "Dynasty King", 9, 3, [120, 135, 140, 110, 150, 125, 130, 145, 115, 128, 138, 142]);
  const teamB = createMockTeam(2, "Waiver Wire Wizard", 6, 6, [100, 105, 110, 95, 120, 108, 112, 115, 98, 104, 111, 109]);
  const teamC = createMockTeam(3, "Unlucky Champion", 4, 8, [130, 128, 135, 140, 122, 138, 129, 131, 125, 133, 127, 136], {
    pointsAgainst: 1680,
    randomScheduleWins: 7.8,
  });
  const allTeams = [teamA, teamB, teamC];

  const leagueInfo: LeagueInfoType = {
    name: "Championship League",
    regularSeasonLength: 14,
    medianScoring: 0,
    totalRosters: 3,
    season: "2024",
    seasonType: "Redraft",
    leagueId: "league-123",
    leagueWinner: null,
    lastUpdated: Date.now(),
    previousLeagueId: null,
    lastScoredWeek: 12,
    winnersBracket: [],
    losersBracket: [],
    espnWinnersBracket: [],
    espnLosersBracket: [],
    users: [],
    rosters: [],
    weeklyPoints: [],
    transactions: {},
    trades: [],
    waivers: [],
    previousLeagues: [],
    status: "in_season",
    currentWeek: 13,
    scoringType: 0,
    rosterPositions: ["QB", "RB", "WR", "TE", "K", "DEF"],
    playoffTeams: 2,
    playoffType: 1,
    draftId: "draft-1",
    waiverType: 1,
    sport: "nfl",
  };

  describe("Utility functions: scoreToLetterGrade & clamp", () => {
    it("converts numerical scores to correct letter grade brackets", () => {
      expect(scoreToLetterGrade(96)).toBe("A+");
      expect(scoreToLetterGrade(94)).toBe("A+");
      expect(scoreToLetterGrade(90)).toBe("A");
      expect(scoreToLetterGrade(88)).toBe("A");
      expect(scoreToLetterGrade(84)).toBe("A-");
      expect(scoreToLetterGrade(82)).toBe("A-");
      expect(scoreToLetterGrade(78)).toBe("B+");
      expect(scoreToLetterGrade(76)).toBe("B+");
      expect(scoreToLetterGrade(72)).toBe("B");
      expect(scoreToLetterGrade(70)).toBe("B");
      expect(scoreToLetterGrade(66)).toBe("B-");
      expect(scoreToLetterGrade(64)).toBe("B-");
      expect(scoreToLetterGrade(60)).toBe("C+");
      expect(scoreToLetterGrade(58)).toBe("C+");
      expect(scoreToLetterGrade(54)).toBe("C");
      expect(scoreToLetterGrade(52)).toBe("C");
      expect(scoreToLetterGrade(48)).toBe("C-");
      expect(scoreToLetterGrade(46)).toBe("C-");
      expect(scoreToLetterGrade(42)).toBe("D+");
      expect(scoreToLetterGrade(40)).toBe("D+");
      expect(scoreToLetterGrade(36)).toBe("D");
      expect(scoreToLetterGrade(34)).toBe("D");
      expect(scoreToLetterGrade(20)).toBe("F");
    });

    it("clamps values strictly within min and max boundaries", () => {
      expect(clamp(50, 10, 90)).toBe(50);
      expect(clamp(5, 10, 90)).toBe(10);
      expect(clamp(95, 10, 90)).toBe(90);
    });
  });

  describe("computePositionalGrades", () => {
    it("extracts weekly positional metrics and ranks across all standard positions", () => {
      const grades = computePositionalGrades(teamA, allTeams, leagueInfo);

      POSITIONS_LIST.forEach((pos: PositionKey) => {
        const g = grades[pos];
        expect(g).toBeDefined();
        expect(g.position).toBe(pos);
        expect(g.score).toBeGreaterThanOrEqual(15);
        expect(g.score).toBeLessThanOrEqual(99);
        expect(g.rank).toBeGreaterThanOrEqual(1);
        expect(g.rank).toBeLessThanOrEqual(allTeams.length);
        expect(g.ppg).toBeGreaterThanOrEqual(0);
        expect(g.starterAvg).toBeGreaterThanOrEqual(0);
        expect(g.benchAvg).toBeGreaterThanOrEqual(0);
        expect(g.leagueAvgPpg).toBeGreaterThanOrEqual(0);
        expect(g.leagueMaxPpg).toBeGreaterThanOrEqual(0);
        expect(["Elite", "Strong", "Average", "Vulnerable", "Critical Need"]).toContain(g.tier);
      });
    });

    it("handles fallback to rosterRankings if weekly starterPoints is empty", () => {
      const teamWithRankings = createMockTeam(4, "Roster Ranked Team", 5, 5, [100, 110], {
        starterPoints: [],
        starterNames: [],
      });
      const leagueWithRosters: LeagueInfoType = {
        ...leagueInfo,
        rosterRankings: {
          4: [
            { id: "p-qb", firstName: "Patrick", lastName: "Mahomes", position: "QB", points: "280.5" },
            { id: "p-rb", firstName: "Breece", lastName: "Hall", position: "RB", points: "240.0" },
            { id: "p-wr", firstName: "Tyreek", lastName: "Hill", position: "WR", points: "260.0" },
          ],
        },
      };

      const grades = computePositionalGrades(teamWithRankings, [teamWithRankings], leagueWithRosters);
      expect(grades.QB.keyStarters[0].name).toContain("Patrick Mahomes");
      expect(grades.RB.keyStarters[0].name).toContain("Breece Hall");
      expect(grades.WR.keyStarters[0].name).toContain("Tyreek Hill");
    });

    it("handles fallback to synthetic positional distribution if no player data is present", () => {
      const syntheticTeam = createMockTeam(5, "Synthetic Team", 6, 4, [120, 120], {
        starterPoints: [],
        starterNames: [],
        benchPoints: [],
        benchNames: [],
      });

      const grades = computePositionalGrades(syntheticTeam, [syntheticTeam], leagueInfo);
      expect(grades.QB.totalPoints).toBeGreaterThan(0);
      expect(grades.RB.totalPoints).toBeGreaterThan(0);
      expect(grades.WR.totalPoints).toBeGreaterThan(0);
      expect(grades.TE.totalPoints).toBeGreaterThan(0);
      expect(grades.K.totalPoints).toBeGreaterThan(0);
      expect(grades.DEF.totalPoints).toBeGreaterThan(0);
    });

    it("correctly parses string starter names and roster position slots including flex", () => {
      const flexTeam = createMockTeam(6, "Flex Team", 5, 5, [100], {
        starterPoints: [[20, 15]],
        starterNames: [["Player A", "Player B"] as any],
      });
      const flexLeague: LeagueInfoType = {
        ...leagueInfo,
        rosterPositions: ["QB", "FLEX"],
      };

      const grades = computePositionalGrades(flexTeam, [flexTeam], flexLeague);
      expect(grades.QB.totalPoints).toBe(20);
      expect(grades.WR.totalPoints).toBe(15); // FLEX maps to WR fallback
    });
  });

  describe("computeLuckAnalysis", () => {
    it("evaluates lucky teams with positive luck delta and favorable schedules", () => {
      const lucky = computeLuckAnalysis(teamA, allTeams);
      expect(lucky.actualWins).toBe(9);
      expect(lucky.luckDelta).toBeDefined();
      expect(lucky.luckScore).toBeGreaterThanOrEqual(5);
      expect(lucky.luckScore).toBeLessThanOrEqual(98);
      expect(lucky.explanation.length).toBeGreaterThan(10);
    });

    it("evaluates snakebitten teams facing brutal schedule difficulty and high points against", () => {
      const unlucky = computeLuckAnalysis(teamC, allTeams);
      expect(unlucky.actualWins).toBe(4);
      expect(unlucky.expectedWins).toBe(7.8);
      expect(unlucky.luckDelta).toBe(-3.8);
      expect(unlucky.luckGrade).toBe("Snakebitten");
      expect(unlucky.pointsAgainstRank).toBe(1);
      expect(unlucky.scheduleDifficulty).toBe("Brutal");
      expect(unlucky.explanation).toContain("snakebitten");
    });

    it("calculates expected wins from winsAgainstAll when randomScheduleWins is missing", () => {
      const fallbackTeam = createMockTeam(7, "No Rand Wins", 7, 3, [120, 110], {
        randomScheduleWins: undefined,
        winsAgainstAll: 14,
        lossesAgainstAll: 6,
      });
      const luck = computeLuckAnalysis(fallbackTeam, [fallbackTeam]);
      // 14 / (14+6) = 0.7 * 2 weeks = 1.4 expected wins
      expect(luck.expectedWins).toBe(1.4);
    });
  });

  describe("computeConsistencyMetrics", () => {
    it("computes standard deviation, CV, floor, ceiling, and boom/bust counts", () => {
      const consistency = computeConsistencyMetrics(teamA, allTeams);
      expect(consistency.ceiling).toBe(150);
      expect(consistency.floor).toBe(110);
      expect(consistency.range).toBe(40);
      expect(consistency.averageScore).toBeCloseTo(131.5, 1);
      expect(consistency.medianScore).toBeGreaterThan(0);
      expect(consistency.standardDeviation).toBeGreaterThan(0);
      expect(consistency.coefficientOfVariation).toBeGreaterThan(0);
      expect(consistency.weeklyScores.length).toBe(12);
      expect(consistency.boomWeeks + consistency.bustWeeks + consistency.neutralWeeks).toBe(12);
      expect(["Rock Solid", "Moderately Consistent", "High Volatility", "Wild Rollercoaster"]).toContain(
        consistency.volatilityLabel
      );
    });

    it("detects upward and downward scoring trends over the last 3 weeks", () => {
      const upTeam = createMockTeam(8, "Trending Up", 5, 5, [100, 100, 100, 100, 100, 100, 140, 145, 150]);
      const upMetrics = computeConsistencyMetrics(upTeam, [upTeam]);
      expect(upMetrics.trend).toBe("Trending Up");
      expect(upMetrics.trendDelta).toBeGreaterThanOrEqual(6.0);

      const downTeam = createMockTeam(9, "Trending Down", 5, 5, [140, 145, 150, 140, 145, 150, 90, 85, 80]);
      const downMetrics = computeConsistencyMetrics(downTeam, [downTeam]);
      expect(downMetrics.trend).toBe("Trending Down");
      expect(downMetrics.trendDelta).toBeLessThanOrEqual(-6.0);
    });

    it("returns zeroed metrics gracefully for teams with empty points", () => {
      const emptyTeam = createMockTeam(10, "Empty Team", 0, 0, []);
      const metrics = computeConsistencyMetrics(emptyTeam, [emptyTeam]);
      expect(metrics.averageScore).toBe(0);
      expect(metrics.ceiling).toBe(0);
      expect(metrics.floor).toBe(0);
      expect(metrics.weeklyScores).toEqual([]);
      expect(metrics.trend).toBe("Steady");
    });
  });

  describe("computeEfficiencyMetrics", () => {
    it("measures start/sit effectiveness, bench points, and starter reliability", () => {
      const eff = computeEfficiencyMetrics(teamA, allTeams);
      expect(eff.actualPoints).toBe(teamA.pointsFor);
      expect(eff.potentialPoints).toBeGreaterThanOrEqual(eff.actualPoints);
      expect(eff.efficiencyPercentage).toBeGreaterThan(0);
      expect(eff.pointsLeftOnBench).toBeGreaterThanOrEqual(0);
      expect(eff.pointsLeftOnBenchPerWeek).toBeGreaterThanOrEqual(0);
      expect(eff.efficiencyRank).toBeGreaterThanOrEqual(1);
      expect(eff.efficiencyGrade).toBeTruthy();
      expect(eff.benchPointsTotal).toBeGreaterThan(0);
      expect(eff.benchPointsAvg).toBeGreaterThan(0);
      expect(eff.rosterDepthScore).toBeGreaterThanOrEqual(15);
      expect(eff.starterReliabilityIndex).toBeGreaterThanOrEqual(20);
    });

    it("estimates bench points accurately when benchPoints array is missing", () => {
      const noBenchTeam = createMockTeam(11, "No Bench Array", 6, 4, [110, 120], {
        benchPoints: [],
      });
      const eff = computeEfficiencyMetrics(noBenchTeam, [noBenchTeam]);
      expect(eff.benchPointsTotal).toBeGreaterThan(0);
    });
  });

  describe("computePlayoffPath", () => {
    it("uses playoffProjections from leagueInfo when available", () => {
      const leagueWithProj: LeagueInfoType = {
        ...leagueInfo,
        playoffProjections: [
          { id: "user-1", name: "Dynasty King", playoffPercentage: 92.5, projectedWinsTotal: 10.4 },
        ],
      };

      const path = computePlayoffPath(teamA, allTeams, leagueWithProj);
      expect(path.playoffProbability).toBe(92.5);
      expect(path.projectedWinsTotal).toBe(10.4);
      expect(path.clinchStatus).toBe("High Odds");
    });

    it("normalizes playoff percentage if stored as 2000-based integer", () => {
      const leagueWithIntProj: LeagueInfoType = {
        ...leagueInfo,
        playoffProjections: [
          { id: "user-1", name: "Dynasty King", playoffPercentage: 1980, projectedWinsTotal: 11 },
        ],
      };

      const path = computePlayoffPath(teamA, allTeams, leagueWithIntProj);
      expect(path.playoffProbability).toBe(99);
      expect(path.clinchStatus).toBe("Clinched");
    });

    it("computes heuristic playoff simulation when projections are missing", () => {
      const path = computePlayoffPath(teamA, allTeams, leagueInfo);
      expect(path.playoffProbability).toBeGreaterThan(50);
      expect(path.projectedWinsTotal).toBeGreaterThan(teamA.wins);
      expect(path.remainingOpponents).toBeDefined();
    });

    it("evaluates completed regular season cutoff at 100% or 0% playoff probability", () => {
      const endOfSeasonLeague: LeagueInfoType = {
        ...leagueInfo,
        regularSeasonLength: 12,
      };
      const playoffBoundTeam = createMockTeam(1, "Playoff Bound", 9, 3, [120, 135, 140, 110, 150, 125, 130, 145, 115, 128, 138, 142], {
        regularSeasonRank: 1,
      });
      const playoffBound = computePlayoffPath(playoffBoundTeam, allTeams, endOfSeasonLeague);
      expect(playoffBound.playoffProbability).toBe(100);

      const eliminatedTeam = createMockTeam(12, "Eliminated", 1, 11, [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80], {
        regularSeasonRank: 8,
      });
      const eliminatedPath = computePlayoffPath(eliminatedTeam, [...allTeams, eliminatedTeam], endOfSeasonLeague);
      expect(eliminatedPath.playoffProbability).toBe(0);
      expect(eliminatedPath.clinchStatus).toBe("Eliminated");
    });
  });

  describe("generateTeamDiagnostics & analyzeTeam", () => {
    it("generates comprehensive diagnostic recommendations and radar data", () => {
      const full = analyzeTeam(teamA, allTeams, leagueInfo);

      expect(full.team.id).toBe(teamA.id);
      expect(full.positionalRadarData.categories).toEqual(POSITIONS_LIST);
      expect(full.positionalRadarData.teamScores.length).toBe(6);
      expect(full.positionalRadarData.leagueAverages.length).toBe(6);

      expect(full.diagnostics.overallRating).toBeGreaterThanOrEqual(20);
      expect(full.diagnostics.overallRating).toBeLessThanOrEqual(99);
      expect(full.diagnostics.powerRank).toBe(1);
      expect(full.diagnostics.strengths.length).toBeGreaterThan(0);
      expect(full.diagnostics.weaknesses.length).toBeGreaterThan(0);
      expect(full.diagnostics.recommendations.length).toBeGreaterThan(0);
      expect(full.diagnostics.aiOutlook).toContain("Dynasty King");
    });

    it("creates appropriate roster alerts for team strengths and weaknesses", () => {
      const diagnostics = generateTeamDiagnostics(
        teamA,
        allTeams,
        computePositionalGrades(teamA, allTeams, leagueInfo),
        computeLuckAnalysis(teamA, allTeams),
        computeConsistencyMetrics(teamA, allTeams),
        computeEfficiencyMetrics(teamA, allTeams),
        computePlayoffPath(teamA, allTeams, leagueInfo)
      );

      expect(diagnostics.rosterAlerts.length).toBeGreaterThan(0);
      const alertTypes = diagnostics.rosterAlerts.map((a) => a.type);
      expect(alertTypes.some((t) => t === "info" || t === "success" || t === "warning")).toBe(true);
    });
  });
});
