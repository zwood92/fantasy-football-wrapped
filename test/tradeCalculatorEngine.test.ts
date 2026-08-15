import { describe, expect, it } from "vitest";
import {
  calculatePackageEffectiveValue,
  calculatePlayerTradeValue,
  calculateTradeBalanceSuggestions,
  evaluateTrade,
  generateTradeVerdict,
  getAssetValue,
  getDraftPickValue,
  getDynastyAgeMultiplier,
  getFaabValue,
  STANDARD_SCARCITY,
  SUPERFLEX_SCARCITY,
  type TradeAsset,
  type TradeDraftPickAsset,
  type TradeFaabAsset,
  type TradePlayerAsset,
  type ValuationContext,
} from "../src/lib/tradeCalculatorEngine";

describe("tradeCalculatorEngine", () => {
  describe("Scarcity Constants", () => {
    it("exports valid standard and superflex scarcity mappings", () => {
      expect(STANDARD_SCARCITY.QB).toBeLessThan(STANDARD_SCARCITY.RB);
      expect(SUPERFLEX_SCARCITY.QB).toBeGreaterThan(SUPERFLEX_SCARCITY.RB);
      expect(STANDARD_SCARCITY.K).toBeLessThan(0.3);
      expect(STANDARD_SCARCITY.DEF).toBeLessThan(0.3);
    });
  });

  describe("getDynastyAgeMultiplier", () => {
    it("applies accurate age curve brackets for running backs", () => {
      expect(getDynastyAgeMultiplier("RB", 21)).toBe(1.1);
      expect(getDynastyAgeMultiplier("RB", 23)).toBe(1.1);
      expect(getDynastyAgeMultiplier("RB", 24)).toBe(1.02);
      expect(getDynastyAgeMultiplier("RB", 25)).toBe(1.02);
      expect(getDynastyAgeMultiplier("RB", 26)).toBe(0.95);
      expect(getDynastyAgeMultiplier("RB", 27)).toBe(0.82);
      expect(getDynastyAgeMultiplier("RB", 28)).toBe(0.68);
      expect(getDynastyAgeMultiplier("RB", 29)).toBe(0.5);
      expect(getDynastyAgeMultiplier("RB", 30)).toBe(0.32);
      expect(getDynastyAgeMultiplier("RB", 32)).toBe(0.18);
    });

    it("applies accurate age curve brackets for wide receivers", () => {
      expect(getDynastyAgeMultiplier("WR", 22)).toBe(1.12);
      expect(getDynastyAgeMultiplier("WR", 25)).toBe(1.02);
      expect(getDynastyAgeMultiplier("WR", 27)).toBe(0.94);
      expect(getDynastyAgeMultiplier("WR", 29)).toBe(0.84);
      expect(getDynastyAgeMultiplier("WR", 30)).toBe(0.72);
      expect(getDynastyAgeMultiplier("WR", 31)).toBe(0.56);
      expect(getDynastyAgeMultiplier("WR", 32)).toBe(0.4);
      expect(getDynastyAgeMultiplier("WR", 34)).toBe(0.24);
    });

    it("applies accurate age curve brackets for quarterbacks", () => {
      expect(getDynastyAgeMultiplier("QB", 23)).toBe(1.1);
      expect(getDynastyAgeMultiplier("QB", 28)).toBe(1.0);
      expect(getDynastyAgeMultiplier("QB", 32)).toBe(0.92);
      expect(getDynastyAgeMultiplier("QB", 34)).toBe(0.8);
      expect(getDynastyAgeMultiplier("QB", 36)).toBe(0.64);
      expect(getDynastyAgeMultiplier("QB", 38)).toBe(0.48);
      expect(getDynastyAgeMultiplier("QB", 41)).toBe(0.3);
    });

    it("applies accurate age curve brackets for tight ends", () => {
      expect(getDynastyAgeMultiplier("TE", 23)).toBe(1.05);
      expect(getDynastyAgeMultiplier("TE", 27)).toBe(1.0);
      expect(getDynastyAgeMultiplier("TE", 29)).toBe(0.88);
      expect(getDynastyAgeMultiplier("TE", 31)).toBe(0.74);
      expect(getDynastyAgeMultiplier("TE", 32)).toBe(0.58);
      expect(getDynastyAgeMultiplier("TE", 34)).toBe(0.35);
    });

    it("handles kickers, defense, IDP and unknown positions", () => {
      expect(getDynastyAgeMultiplier("K", 25)).toBe(1.0);
      expect(getDynastyAgeMultiplier("DEF", 30)).toBe(0.85);
      expect(getDynastyAgeMultiplier("UNKNOWN", 25)).toBe(1.0);
    });

    it("defaults to age 25 when age is missing or non-positive", () => {
      const defaultRb = getDynastyAgeMultiplier("RB", undefined);
      const defaultAgeZero = getDynastyAgeMultiplier("RB", 0);
      expect(defaultRb).toBe(1.02); // Age 25 RB multiplier
      expect(defaultAgeZero).toBe(1.02);
    });

    it("adjusts multipliers according to contender vs rebuilder perspectives", () => {
      // Contender boosts older veterans, slightly discounts rookies
      const vetContender = getDynastyAgeMultiplier("WR", 30, "contender");
      const vetBalanced = getDynastyAgeMultiplier("WR", 30, "balanced");
      expect(vetContender).toBeCloseTo(vetBalanced * 1.15, 2);

      const rookieContender = getDynastyAgeMultiplier("WR", 22, "contender");
      const rookieBalanced = getDynastyAgeMultiplier("WR", 22, "balanced");
      expect(rookieContender).toBeCloseTo(rookieBalanced * 0.95, 2);

      // Rebuilder heavily boosts young players and penalizes older players
      const rookieRebuilder = getDynastyAgeMultiplier("RB", 22, "rebuilder");
      expect(rookieRebuilder).toBeCloseTo(1.1 * 1.25, 2);

      const vetRebuilder = getDynastyAgeMultiplier("RB", 29, "rebuilder");
      expect(vetRebuilder).toBeCloseTo(0.5 * 0.7, 2);
    });
  });

  describe("getDraftPickValue", () => {
    it("calculates tiered values for early, mid, and late 1st round picks", () => {
      const pick101 = getDraftPickValue({ season: 2026, round: 1, pickNumber: 1 }, 2026);
      const pick104 = getDraftPickValue({ season: 2026, round: 1, pickNumber: 4 }, 2026);
      const pick105 = getDraftPickValue({ season: 2026, round: 1, pickNumber: 5 }, 2026);
      const pick108 = getDraftPickValue({ season: 2026, round: 1, pickNumber: 8 }, 2026);
      const pick109 = getDraftPickValue({ season: 2026, round: 1, pickNumber: 9 }, 2026);
      const pick112 = getDraftPickValue({ season: 2026, round: 1, pickNumber: 12 }, 2026);
      const pickMid1st = getDraftPickValue({ season: 2026, round: 1 }, 2026);

      expect(pick101).toBe(78);
      expect(pick104).toBe(66);
      expect(pick105).toBe(60);
      expect(pick108).toBe(51);
      expect(pick109).toBe(48);
      expect(pick112).toBe(40.5);
      expect(pickMid1st).toBe(56);
    });

    it("assigns appropriate baseline values for rounds 2 through 7+", () => {
      expect(getDraftPickValue({ season: 2026, round: 2 }, 2026)).toBe(28);
      expect(getDraftPickValue({ season: 2026, round: 3 }, 2026)).toBe(14);
      expect(getDraftPickValue({ season: 2026, round: 4 }, 2026)).toBe(6.5);
      expect(getDraftPickValue({ season: 2026, round: 5 }, 2026)).toBe(3.5);
      expect(getDraftPickValue({ season: 2026, round: 6 }, 2026)).toBe(2.0);
      expect(getDraftPickValue({ season: 2026, round: 99 }, 2026)).toBe(2.0);
    });

    it("applies annual compounding discount for future year picks", () => {
      const curYear = getDraftPickValue({ season: 2026, round: 1 }, 2026);
      const plus1Year = getDraftPickValue({ season: 2027, round: 1 }, 2026);
      const plus2Years = getDraftPickValue({ season: 2028, round: 1 }, 2026);

      expect(curYear).toBe(56);
      expect(plus1Year).toBeCloseTo(56 * 0.86, 1);
      expect(plus2Years).toBeCloseTo(56 * Math.pow(0.86, 2), 1);
    });

    it("adjusts values based on dynasty perspective", () => {
      const rebuilderPick = getDraftPickValue({ season: 2026, round: 1 }, 2026, "rebuilder");
      const contenderPick = getDraftPickValue({ season: 2026, round: 1 }, 2026, "contender");

      expect(rebuilderPick).toBeCloseTo(56 * 1.22, 1);
      expect(contenderPick).toBeCloseTo(56 * 0.88, 1);
    });
  });

  describe("getFaabValue", () => {
    it("returns 0 for zero or negative FAAB amounts", () => {
      expect(getFaabValue(0)).toBe(0);
      expect(getFaabValue(-10)).toBe(0);
    });

    it("scales FAAB value based on remaining season weeks and budget proportion", () => {
      const earlySeason = getFaabValue(50, 17, 100);
      const midSeason = getFaabValue(50, 8.5, 100);
      const lateSeason = getFaabValue(50, 1, 100);

      expect(earlySeason).toBe(5.0);
      expect(midSeason).toBeCloseTo(2.5, 1);
      expect(lateSeason).toBe(1.0); // clamped min ratio 0.2
    });
  });

  describe("calculatePlayerTradeValue", () => {
    it("respects explicit pre-computed tradeValue on the player object", () => {
      const val = calculatePlayerTradeValue({
        id: "p1",
        name: "CeeDee Lamb",
        tradeValue: 88.5,
      });
      expect(val).toBe(88.5);
    });

    it("calculates value using dynastyAdp curve when available", () => {
      const eliteRookie = calculatePlayerTradeValue(
        {
          id: "marrv",
          position: "WR",
          dynastyAdp: 4,
          age: 22,
          vorp: 45,
        },
        { seasonType: "dynasty" }
      );
      expect(eliteRookie).toBeGreaterThan(70);
    });

    it("calculates value using VORP when available", () => {
      const highVorp = calculatePlayerTradeValue(
        {
          id: "rb1",
          position: "RB",
          vorp: 50,
        },
        { isSuperflex: false }
      );
      const lowVorp = calculatePlayerTradeValue(
        {
          id: "rb2",
          position: "RB",
          vorp: -10,
        },
        { isSuperflex: false }
      );
      expect(highVorp).toBeGreaterThan(lowVorp);
      expect(highVorp).toBeGreaterThan(50);
    });

    it("calculates value using positionRank as fallback", () => {
      const wr1 = calculatePlayerTradeValue({
        id: "wr1",
        position: "WR",
        positionRank: 1,
      });
      const wr36 = calculatePlayerTradeValue({
        id: "wr36",
        position: "WR",
        positionRank: 36,
      });
      expect(wr1).toBeGreaterThan(wr36);
      expect(wr1).toBeGreaterThan(90);
    });

    it("applies Superflex scarcity boosts specifically to QBs", () => {
      const qbStandard = calculatePlayerTradeValue(
        { id: "qb1", position: "QB", positionRank: 6 },
        { isSuperflex: false }
      );
      const qbSuperflex = calculatePlayerTradeValue(
        { id: "qb1", position: "QB", positionRank: 6 },
        { isSuperflex: true }
      );
      expect(qbSuperflex).toBeGreaterThan(qbStandard * 1.7);
    });

    it("applies Tight End Premium scarcity boosts to TEs", () => {
      const teStandard = calculatePlayerTradeValue(
        { id: "te1", position: "TE", positionRank: 3 },
        { tePremium: 0 }
      );
      const tePremium = calculatePlayerTradeValue(
        { id: "te1", position: "TE", positionRank: 3 },
        { tePremium: 0.75 }
      );
      expect(tePremium).toBeGreaterThan(teStandard);
    });

    it("defaults to 5.0 for unknown unranked bench players", () => {
      const benchPlayer = calculatePlayerTradeValue({
        id: "nobody",
        name: "Unknown Player",
      });
      expect(benchPlayer).toBe(5.0);
    });
  });

  describe("getAssetValue", () => {
    it("routes asset evaluation by asset type", () => {
      const playerAsset: TradePlayerAsset = {
        type: "player",
        id: "p1",
        name: "Amon-Ra",
        tradeValue: 75,
        position: "WR",
      };
      const pickAsset: TradeDraftPickAsset = {
        type: "draft_pick",
        id: "pick1",
        season: 2026,
        round: 1,
      };
      const faabAsset: TradeFaabAsset = {
        type: "faab",
        id: "faab1",
        amount: 50,
      };

      expect(getAssetValue(playerAsset)).toBe(75);
      expect(getAssetValue(pickAsset, { currentSeason: 2026 })).toBe(56);
      expect(getAssetValue(faabAsset, { remainingWeeks: 17 })).toBe(5);
      expect(getAssetValue({ type: "unknown" as any, id: "u" } as any)).toBe(0);
    });
  });

  describe("calculatePackageEffectiveValue", () => {
    it("returns zero for empty asset arrays", () => {
      expect(calculatePackageEffectiveValue([])).toEqual({ rawTotal: 0, effectiveTotal: 0 });
    });

    it("applies diminishing returns weights for multi-asset packages", () => {
      const assets: TradePlayerAsset[] = [
        { type: "player", id: "1", name: "P1", position: "WR", tradeValue: 50 },
        { type: "player", id: "2", name: "P2", position: "RB", tradeValue: 40 },
        { type: "player", id: "3", name: "P3", position: "WR", tradeValue: 30 },
        { type: "player", id: "4", name: "P4", position: "TE", tradeValue: 20 },
      ];

      const result = calculatePackageEffectiveValue(assets);
      expect(result.rawTotal).toBe(140);
      // 50*1.0 + 40*0.88 + 30*0.76 + 20*0.62 = 50 + 35.2 + 22.8 + 12.4 = 120.4
      expect(result.effectiveTotal).toBe(120.4);
    });
  });

  describe("evaluateTrade", () => {
    it("handles trades with empty assets cleanly", () => {
      const bothEmpty = evaluateTrade([], []);
      expect(bothEmpty.fairnessScore).toBe(100);
      expect(bothEmpty.favoredSide).toBe("even");
      expect(bothEmpty.summary).toContain("Add assets to both teams");

      const oneSideEmpty = evaluateTrade(
        [{ type: "player", id: "1", name: "P1", position: "WR", tradeValue: 50 }],
        []
      );
      expect(oneSideEmpty.summary).toContain("Add assets to both sides");
    });

    it("categorizes fairness labels appropriately based on gap percentage", () => {
      const superstar: TradeAsset[] = [
        { type: "player", id: "1", name: "Stud", position: "WR", tradeValue: 100, projectedPoints: 250 },
      ];
      const evenPartner: TradeAsset[] = [
        { type: "player", id: "2", name: "Stud 2", position: "RB", tradeValue: 98, projectedPoints: 245 },
      ];
      const fairPartner: TradeAsset[] = [
        { type: "player", id: "2b", name: "Stud 3", position: "RB", tradeValue: 92, projectedPoints: 235 },
      ];
      const slightUnevenPartner: TradeAsset[] = [
        { type: "player", id: "3", name: "Good", position: "RB", tradeValue: 70, projectedPoints: 180 },
      ];
      const lopsidedPartner: TradeAsset[] = [
        { type: "player", id: "4", name: "Bench", position: "RB", tradeValue: 25, projectedPoints: 80 },
      ];

      const evenTrade = evaluateTrade(superstar, evenPartner);
      expect(evenTrade.fairnessLabel).toBe("Very fair");
      expect(evenTrade.favoredSide).toBe("even");

      const veryFairTrade = evaluateTrade(superstar, fairPartner);
      expect(veryFairTrade.fairnessLabel).toBe("Very fair");
      expect(veryFairTrade.favoredSide).toBe("team_b");

      const slightlyUneven = evaluateTrade(superstar, slightUnevenPartner);
      expect(slightlyUneven.fairnessLabel).toBe("Slightly uneven");
      expect(slightlyUneven.favoredSide).toBe("team_b");

      const uneven = evaluateTrade(superstar, lopsidedPartner);
      expect(uneven.fairnessLabel).toBe("Uneven");
      expect(uneven.favoredSide).toBe("team_b");
    });

    it("calculates comprehensive positional and points deltas for all asset types", () => {
      const teamA: TradeAsset[] = [
        { type: "player", id: "p1", name: "WR1", position: "WR", tradeValue: 60, projectedPoints: 200 },
        { type: "draft_pick", id: "pick1", season: 2026, round: 2 },
      ];
      const teamB: TradeAsset[] = [
        { type: "player", id: "p2", name: "RB1", position: "RB", tradeValue: 65, projectedPoints: 220 },
        { type: "faab", id: "faab1", amount: 40 },
      ];

      const result = evaluateTrade(teamA, teamB, { currentSeason: 2026 });

      expect(result.netPositionalImpact.teamA.WR.outgoingCount).toBe(1);
      expect(result.netPositionalImpact.teamA.RB.incomingCount).toBe(1);
      expect(result.netPositionalImpact.teamA.PICKS.outgoingCount).toBe(1);
      expect(result.netPositionalImpact.teamA.FAAB.incomingCount).toBe(1);

      expect(result.teamAPointsNetGain).toBe(20); // +220 incoming - 200 outgoing
      expect(result.teamBPointsNetGain).toBe(-20);
      expect(result.recommendations.some((r) => r.includes("fantasy points"))).toBe(true);
    });
  });

  describe("calculateTradeBalanceSuggestions", () => {
    it("returns null if the trade is already balanced", () => {
      const a: TradeAsset[] = [{ type: "player", id: "1", name: "P1", position: "WR", tradeValue: 50 }];
      const b: TradeAsset[] = [{ type: "player", id: "2", name: "P2", position: "WR", tradeValue: 51 }];
      expect(calculateTradeBalanceSuggestions(a, b)).toBeNull();
    });

    it("generates FAAB, pick, and roster player balance options", () => {
      const a: TradeAsset[] = [{ type: "player", id: "1", name: "Stud", position: "WR", tradeValue: 80 }];
      const b: TradeAsset[] = [{ type: "player", id: "2", name: "Starter", position: "RB", tradeValue: 50 }];
      const availableB: TradeAsset[] = [
        { type: "player", id: "b1", name: "Sweetener WR", position: "WR", tradeValue: 28 },
        { type: "player", id: "b2", name: "Irrelevant", position: "K", tradeValue: 1 },
      ];

      const suggestion = calculateTradeBalanceSuggestions(a, b, { currentSeason: 2026 }, [], availableB);
      expect(suggestion).not.toBeNull();
      expect(suggestion?.sideNeedingValue).toBe("team_b");
      expect(suggestion?.deficit).toBeCloseTo(30, 0);

      const hasPlayerSuggestion = suggestion?.suggestions.some((s) => s.type === "player" && s.playerName === "Sweetener WR");
      const hasPickSuggestion = suggestion?.suggestions.some((s) => s.type === "draft_pick");
      const hasFaabSuggestion = suggestion?.suggestions.some((s) => s.type === "faab");

      expect(hasPlayerSuggestion).toBe(true);
      expect(hasPickSuggestion).toBe(true);
      expect(hasFaabSuggestion).toBe(true);
    });
  });

  describe("generateTradeVerdict", () => {
    it("produces full narrative verdict report with grades and key takeaways", () => {
      const teamAAssets: TradeAsset[] = [
        { type: "player", id: "1", name: "Justin Jefferson", position: "WR", tradeValue: 95, projectedPoints: 280 },
      ];
      const teamBAssets: TradeAsset[] = [
        { type: "player", id: "2", name: "Puka Nacua", position: "WR", tradeValue: 75, projectedPoints: 230 },
        { type: "draft_pick", id: "pick1", season: 2027, round: 1 },
      ];

      const verdict = generateTradeVerdict(
        "Alpha Squad",
        "Beta Beasts",
        teamAAssets,
        teamBAssets,
        { seasonType: "dynasty", currentSeason: 2026 }
      );

      expect(verdict.headline).toBeTruthy();
      expect(verdict.winner).toBeTruthy();
      expect(verdict.teamAGrade).toBeTruthy();
      expect(verdict.teamBGrade).toBeTruthy();
      expect(verdict.teamAAnalysis.length).toBeGreaterThan(0);
      expect(verdict.teamBAnalysis.length).toBeGreaterThan(0);
      expect(verdict.verdictText).toContain("dynasty");
      expect(verdict.keyTakeaway).toBeTruthy();
    });

    it("awards appropriate letter grades based on value gained/lost", () => {
      const blockbusterA: TradeAsset[] = [
        { type: "player", id: "1", name: "Mega Stud", position: "WR", tradeValue: 98 },
      ];
      const peanutsB: TradeAsset[] = [
        { type: "player", id: "2", name: "Scrub", position: "WR", tradeValue: 15 },
      ];

      const verdict = generateTradeVerdict("Team Steal", "Team Fleece", blockbusterA, peanutsB);
      // Team Fleece receives Mega Stud (value +98), gives Scrub (15) -> Net gain ~+83 -> Grade A+
      // Team Steal receives Scrub (15), gives Mega Stud (98) -> Net gain ~-83 -> Grade D
      expect(verdict.teamBGrade).toBe("A+");
      expect(verdict.teamAGrade).toBe("D");
    });
  });
});
