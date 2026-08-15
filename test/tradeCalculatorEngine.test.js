import { describe, expect, test } from "vitest";
import {
  calculatePackageEffectiveValue,
  calculatePlayerTradeValue,
  calculateTradeBalanceSuggestions,
  evaluateTrade,
  generateTradeVerdict,
  getDraftPickValue,
  getDynastyAgeMultiplier,
  getFaabValue,
} from "../src/lib/tradeCalculatorEngine";

describe("tradeCalculatorEngine", () => {
  test("computes dynasty age curves properly across positions", () => {
    // RB age cliff
    const rbYoung = getDynastyAgeMultiplier("RB", 22);
    const rbPrime = getDynastyAgeMultiplier("RB", 25);
    const rbCliff = getDynastyAgeMultiplier("RB", 29);
    expect(rbYoung).toBeGreaterThan(rbPrime);
    expect(rbPrime).toBeGreaterThan(rbCliff);
    expect(rbCliff).toBeLessThan(0.6);

    // QB longevity
    const qb30 = getDynastyAgeMultiplier("QB", 30);
    const qb36 = getDynastyAgeMultiplier("QB", 36);
    expect(qb30).toBe(1.0);
    expect(qb36).toBeGreaterThan(0.6);

    // Perspective adjustments
    const rebuilderRb = getDynastyAgeMultiplier("RB", 22, "rebuilder");
    const contenderRb = getDynastyAgeMultiplier("RB", 22, "contender");
    expect(rebuilderRb).toBeGreaterThan(contenderRb);
  });

  test("calculates draft pick values with future year discounting", () => {
    const pick2026R1 = getDraftPickValue({ season: 2026, round: 1 }, 2026);
    const pick2027R1 = getDraftPickValue({ season: 2027, round: 1 }, 2026);
    const pick2028R1 = getDraftPickValue({ season: 2028, round: 1 }, 2026);
    const pick2026R2 = getDraftPickValue({ season: 2026, round: 2 }, 2026);

    expect(pick2026R1).toBeGreaterThan(pick2027R1);
    expect(pick2027R1).toBeGreaterThan(pick2028R1);
    expect(pick2026R1).toBeGreaterThan(pick2026R2);
    expect(pick2026R2).toBeGreaterThan(15);
  });

  test("converts FAAB dollars to trade value accurately", () => {
    const earlyFaab100 = getFaabValue(100, 16, 100);
    const lateFaab100 = getFaabValue(100, 4, 100);
    const faab0 = getFaabValue(0, 16, 100);

    expect(earlyFaab100).toBeGreaterThan(lateFaab100);
    expect(faab0).toBe(0);
    expect(earlyFaab100).toBeGreaterThan(5);
  });

  test("calculates player trade value accounting for superflex and scarcity", () => {
    const qbStandard = calculatePlayerTradeValue(
      { position: "QB", positionRank: 5, vorp: 60 },
      { isSuperflex: false }
    );
    const qbSuperflex = calculatePlayerTradeValue(
      { position: "QB", positionRank: 5, vorp: 60 },
      { isSuperflex: true }
    );
    expect(qbSuperflex).toBeGreaterThan(qbStandard * 1.5);
  });

  test("evaluates equal trade as very fair and even", () => {
    const teamAAssets = [
      {
        type: "player",
        id: "p1",
        name: "Player 1",
        position: "WR",
        tradeValue: 70,
        projectedPoints: 220,
      },
    ];
    const teamBAssets = [
      {
        type: "player",
        id: "p2",
        name: "Player 2",
        position: "RB",
        tradeValue: 70,
        projectedPoints: 215,
      },
    ];

    const result = evaluateTrade(teamAAssets, teamBAssets);
    expect(result.fairnessScore).toBeGreaterThanOrEqual(98);
    expect(result.fairnessLabel).toBe("Very fair");
    expect(result.favoredSide).toBe("even");
  });

  test("detects uneven trade, favored side, and diminishing package value", () => {
    const superstar = [
      {
        type: "player",
        id: "p1",
        name: "Superstar WR",
        position: "WR",
        tradeValue: 90,
        projectedPoints: 280,
      },
    ];
    const threeAverage = [
      {
        type: "player",
        id: "p2",
        name: "Flex 1",
        position: "WR",
        tradeValue: 30,
        projectedPoints: 120,
      },
      {
        type: "player",
        id: "p3",
        name: "Flex 2",
        position: "RB",
        tradeValue: 30,
        projectedPoints: 120,
      },
      {
        type: "player",
        id: "p4",
        name: "Flex 3",
        position: "WR",
        tradeValue: 30,
        projectedPoints: 120,
      },
    ];

    // Raw sum is 90 vs 90, but effective total for 3-for-1 applies package tax
    const pkg3 = calculatePackageEffectiveValue(threeAverage);
    expect(pkg3.rawTotal).toBe(90);
    expect(pkg3.effectiveTotal).toBeLessThan(85);

    // Team A sends superstar (receives 3 players), Team B sends 3 players (receives superstar)
    const result = evaluateTrade(superstar, threeAverage);
    // Team B receives the superstar (worth 90 effective), Team A receives 3 players (worth ~79 effective)
    // So Team B is favored (gets more value than they send)
    expect(result.favoredSide).toBe("team_b");
  });

  test("generates balance suggestions for uneven trade", () => {
    const teamAAssets = [
      {
        type: "player",
        id: "p1",
        name: "Star",
        position: "WR",
        tradeValue: 80,
      },
    ];
    const teamBAssets = [
      {
        type: "player",
        id: "p2",
        name: "Starter",
        position: "WR",
        tradeValue: 50,
      },
    ];

    const suggestion = calculateTradeBalanceSuggestions(
      teamAAssets,
      teamBAssets,
      { currentSeason: 2026 }
    );

    expect(suggestion).not.toBeNull();
    expect(suggestion?.sideNeedingValue).toBe("team_b");
    expect(suggestion?.suggestions.length).toBeGreaterThan(0);
  });

  test("generates rich AI trade verdict report", () => {
    const teamAAssets = [
      {
        type: "player",
        id: "p1",
        name: "Justin Jefferson",
        position: "WR",
        tradeValue: 92,
        projectedPoints: 280,
      },
    ];
    const teamBAssets = [
      {
        type: "player",
        id: "p2",
        name: "Jahmyr Gibbs",
        position: "RB",
        tradeValue: 88,
        projectedPoints: 260,
      },
      {
        type: "draft_pick",
        id: "pick1",
        season: 2027,
        round: 2,
      },
    ];

    const verdict = generateTradeVerdict(
      "Team Alpha",
      "Team Beta",
      teamAAssets,
      teamBAssets,
      { seasonType: "dynasty" }
    );

    expect(verdict.headline).toBeTruthy();
    expect(verdict.verdictText).toContain("fairness score");
    expect(verdict.teamAGrade).toBeTruthy();
    expect(verdict.teamBGrade).toBeTruthy();
    expect(verdict.keyTakeaway).toBeTruthy();
  });
});
