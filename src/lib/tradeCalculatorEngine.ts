import type { DynastyPerspective, TradeValuationMode } from "@/lib/tradeFinder";

export type PositionScarcityMap = Record<string, number>;

export interface TradePlayerAsset {
  type: "player";
  id: string;
  name: string;
  position: string;
  team?: string;
  projectedPoints?: number;
  replacementPoints?: number;
  vorp?: number;
  tradeValue?: number;
  positionRank?: number;
  overallRank?: number;
  dynastyAdp?: number | null;
  age?: number;
  yearsExp?: number;
}

export interface TradeDraftPickAsset {
  type: "draft_pick";
  id: string;
  season: number;
  round: number;
  pickNumber?: number; // 1-12 within the round if known
  originalRosterId?: number;
  ownerRosterId?: number;
  label?: string;
  value?: number;
}

export interface TradeFaabAsset {
  type: "faab";
  id: string;
  amount: number;
  value?: number;
}

export type TradeAsset = TradePlayerAsset | TradeDraftPickAsset | TradeFaabAsset;

export interface ValuationContext {
  seasonType?: "redraft" | "dynasty" | "keeper";
  isSuperflex?: boolean;
  scoringType?: number; // 0 = standard, 0.5 = half, 1 = ppr
  tePremium?: number; // e.g. 0.5 for +0.5 PPR to TEs
  totalRosters?: number; // e.g. 10, 12, 14
  currentSeason?: number;
  dynastyPerspective?: DynastyPerspective;
  remainingWeeks?: number;
  valuationMode?: TradeValuationMode;
}

export type FairnessLabel = "Very fair" | "Fair" | "Slightly uneven" | "Uneven";

export interface PositionalDelta {
  incomingCount: number;
  outgoingCount: number;
  incomingValue: number;
  outgoingValue: number;
  netValue: number;
  incomingPoints: number;
  outgoingPoints: number;
  netPoints: number;
}

export interface TradeFairnessAssessment {
  teamARawValue: number;
  teamBRawValue: number;
  teamAEffectiveValue: number; // After package tax / stud consolidation
  teamBEffectiveValue: number;
  fairnessScore: number; // 0 to 100
  fairnessLabel: FairnessLabel;
  favoredSide: "team_a" | "team_b" | "even";
  valueGap: number;
  valueGapPercent: number;
  teamANetGain: number; // Net value gained by Team A (received - sent)
  teamBNetGain: number;
  teamAPointsNetGain: number; // Net projected points gained by Team A
  teamBPointsNetGain: number;
  netPositionalImpact: {
    teamA: Record<string, PositionalDelta>;
    teamB: Record<string, PositionalDelta>;
  };
  summary: string;
  recommendations: string[];
}

export interface BalanceSuggestion {
  sideNeedingValue: "team_a" | "team_b";
  managerName?: string;
  deficit: number;
  suggestions: Array<{
    type: "draft_pick" | "faab" | "player";
    description: string;
    value: number;
    pickSeason?: number;
    pickRound?: number;
    faabAmount?: number;
    playerId?: string;
    playerName?: string;
  }>;
}

export interface TradeVerdictReport {
  headline: string;
  winner: string;
  fairnessLabel: FairnessLabel;
  fairnessScore: number;
  teamAName: string;
  teamBName: string;
  teamAGrade: string;
  teamBGrade: string;
  verdictText: string;
  teamAAnalysis: string[];
  teamBAnalysis: string[];
  keyTakeaway: string;
}

// Positional scarcity multipliers
export const STANDARD_SCARCITY: PositionScarcityMap = {
  QB: 0.88,
  RB: 1.18,
  WR: 1.12,
  TE: 1.02,
  K: 0.15,
  DEF: 0.20,
  DL: 0.35,
  LB: 0.40,
  DB: 0.30,
};

export const SUPERFLEX_SCARCITY: PositionScarcityMap = {
  QB: 1.68,
  RB: 1.05,
  WR: 1.05,
  TE: 0.95,
  K: 0.10,
  DEF: 0.15,
  DL: 0.30,
  LB: 0.35,
  DB: 0.25,
};

// Age curve degradation multipliers for Dynasty
export const getDynastyAgeMultiplier = (
  position: string,
  age?: number,
  perspective: DynastyPerspective = "balanced"
): number => {
  const normPos = (position || "").toUpperCase();
  const playerAge = age && age > 0 ? age : 25; // Default to prime age if unknown

  let baseMultiplier = 1.0;

  if (normPos === "RB") {
    if (playerAge <= 23) baseMultiplier = 1.10;
    else if (playerAge <= 25) baseMultiplier = 1.02;
    else if (playerAge === 26) baseMultiplier = 0.95;
    else if (playerAge === 27) baseMultiplier = 0.82;
    else if (playerAge === 28) baseMultiplier = 0.68;
    else if (playerAge === 29) baseMultiplier = 0.50;
    else if (playerAge === 30) baseMultiplier = 0.32;
    else baseMultiplier = 0.18;
  } else if (normPos === "WR") {
    if (playerAge <= 23) baseMultiplier = 1.12;
    else if (playerAge <= 26) baseMultiplier = 1.02;
    else if (playerAge <= 28) baseMultiplier = 0.94;
    else if (playerAge === 29) baseMultiplier = 0.84;
    else if (playerAge === 30) baseMultiplier = 0.72;
    else if (playerAge === 31) baseMultiplier = 0.56;
    else if (playerAge === 32) baseMultiplier = 0.40;
    else baseMultiplier = 0.24;
  } else if (normPos === "QB") {
    if (playerAge <= 24) baseMultiplier = 1.10;
    else if (playerAge <= 30) baseMultiplier = 1.00;
    else if (playerAge <= 33) baseMultiplier = 0.92;
    else if (playerAge <= 35) baseMultiplier = 0.80;
    else if (playerAge <= 37) baseMultiplier = 0.64;
    else if (playerAge <= 39) baseMultiplier = 0.48;
    else baseMultiplier = 0.30;
  } else if (normPos === "TE") {
    if (playerAge <= 24) baseMultiplier = 1.05;
    else if (playerAge <= 28) baseMultiplier = 1.00;
    else if (playerAge <= 30) baseMultiplier = 0.88;
    else if (playerAge === 31) baseMultiplier = 0.74;
    else if (playerAge === 32) baseMultiplier = 0.58;
    else baseMultiplier = 0.35;
  } else {
    // K / DEF / IDP
    baseMultiplier = playerAge <= 28 ? 1.0 : 0.85;
  }

  // Perspective shifts
  if (perspective === "contender") {
    if (playerAge >= 27) baseMultiplier *= 1.15;
    else if (playerAge <= 23) baseMultiplier *= 0.95;
  } else if (perspective === "rebuilder") {
    if (playerAge >= 28) baseMultiplier *= 0.70;
    else if (playerAge <= 23) baseMultiplier *= 1.25;
    else if (playerAge <= 25) baseMultiplier *= 1.10;
  }

  return Math.max(0.1, Number(baseMultiplier.toFixed(3)));
};

/**
 * Compute the baseline draft pick value for rookie/future picks.
 */
export const getDraftPickValue = (
  pick: { season: number; round: number; pickNumber?: number },
  currentSeason = new Date().getFullYear(),
  perspective: DynastyPerspective = "balanced"
): number => {
  const round = Math.max(1, Math.min(pick.round || 1, 7));
  const yearDelta = Math.max(0, pick.season - currentSeason);

  // Base round values for Year 0
  let baseValue = 0;
  if (round === 1) {
    if (pick.pickNumber && pick.pickNumber >= 1 && pick.pickNumber <= 4) {
      baseValue = 78 - (pick.pickNumber - 1) * 4; // 1.01 = 78, 1.02 = 74, 1.03 = 70, 1.04 = 66
    } else if (pick.pickNumber && pick.pickNumber >= 5 && pick.pickNumber <= 8) {
      baseValue = 60 - (pick.pickNumber - 5) * 3; // 1.05 = 60, 1.08 = 51
    } else if (pick.pickNumber && pick.pickNumber >= 9) {
      baseValue = 48 - (pick.pickNumber - 9) * 2.5; // 1.09 = 48, 1.12 = 40.5
    } else {
      baseValue = 56; // Mid 1st round average
    }
  } else if (round === 2) {
    baseValue = 28;
  } else if (round === 3) {
    baseValue = 14;
  } else if (round === 4) {
    baseValue = 6.5;
  } else if (round === 5) {
    baseValue = 3.5;
  } else {
    baseValue = 2.0;
  }

  // Future pick time discount: ~14% discount per future year
  const discountFactor = Math.pow(0.86, yearDelta);
  let value = baseValue * discountFactor;

  // Perspective factor
  if (perspective === "rebuilder") {
    value *= 1.22;
  } else if (perspective === "contender") {
    value *= 0.88;
  }

  return Number(Math.max(1, value).toFixed(1));
};

/**
 * Convert FAAB dollars to a comparable trade value points scale.
 */
export const getFaabValue = (
  amount: number,
  remainingWeeks = 14,
  totalBudget = 100
): number => {
  if (amount <= 0) return 0;
  const normalizedAmount = Math.min(amount, totalBudget * 2);
  const seasonProgressRatio = Math.max(0.2, Math.min(1.0, remainingWeeks / 17));
  // $100 FAAB early season is worth roughly 10 trade value points (mid 3rd round pick / flex player)
  const fullBudgetValue = 10.0;
  const value = (normalizedAmount / totalBudget) * fullBudgetValue * seasonProgressRatio;
  return Number(Math.max(0.2, value).toFixed(1));
};

/**
 * Calculate player trade value using scoring settings, scarcity, and age curves.
 */
export const calculatePlayerTradeValue = (
  player: {
    playerId?: string;
    id?: string;
    name?: string;
    position?: string;
    team?: string;
    projectedPoints?: number;
    replacementPoints?: number;
    vorp?: number;
    tradeValue?: number;
    positionRank?: number;
    overallRank?: number;
    dynastyAdp?: number | null;
    age?: number;
  },
  context: ValuationContext = {}
): number => {
  if (typeof player.tradeValue === "number" && player.tradeValue > 0) {
    return Number(player.tradeValue.toFixed(1));
  }

  const isDynasty =
    context.seasonType === "dynasty" || context.valuationMode === "dynasty";
  const isSuperflex = Boolean(context.isSuperflex);
  const perspective = context.dynastyPerspective || "balanced";
  const position = (player.position || "WR").toUpperCase();

  const scarcityMultipliers = isSuperflex
    ? SUPERFLEX_SCARCITY
    : STANDARD_SCARCITY;
  let scarcity = scarcityMultipliers[position] ?? 1.0;

  if (position === "TE" && context.tePremium && context.tePremium > 0) {
    scarcity *= 1.0 + context.tePremium * 0.35;
  }

  // 1. If dynasty ADP exists, use the exponential decay curve
  if (isDynasty && player.dynastyAdp && player.dynastyAdp > 0) {
    const adp = player.dynastyAdp;
    // ADP 1 -> ~96, ADP 12 -> ~74, ADP 24 -> ~58, ADP 60 -> ~32, ADP 120 -> ~14
    let adpValue = 100 * Math.exp(-0.024 * (adp - 1));
    const ageMult = getDynastyAgeMultiplier(position, player.age, perspective);
    let finalVal = adpValue * scarcity * (0.65 + 0.35 * ageMult);

    if (player.vorp && player.vorp > 0) {
      finalVal = 0.7 * finalVal + 0.3 * (player.vorp * 0.75 * scarcity);
    }
    return Number(Math.max(0.5, Math.min(99.9, finalVal)).toFixed(1));
  }

  // 2. If VORP or projected points exist, calculate based on replacement level
  if (typeof player.vorp === "number" && player.vorp !== 0) {
    const rawVorp = player.vorp;
    let base = rawVorp > 0 ? 35 + rawVorp * 0.48 : Math.max(0, 35 + rawVorp * 0.8);
    let val = base * scarcity;

    if (isDynasty) {
      const ageMult = getDynastyAgeMultiplier(position, player.age, perspective);
      val *= ageMult;
    }
    return Number(Math.max(0.5, Math.min(99.9, val)).toFixed(1));
  }

  // 3. Fallback based on position rank if available
  if (player.positionRank && player.positionRank > 0) {
    const rank = player.positionRank;
    let base = Math.max(2, 90 * Math.exp(-0.08 * (rank - 1)));
    let val = base * scarcity;

    if (isDynasty) {
      const ageMult = getDynastyAgeMultiplier(position, player.age, perspective);
      val *= ageMult;
    }
    return Number(Math.max(0.5, Math.min(99.9, val)).toFixed(1));
  }

  // 4. Default baseline for unranked bench player
  return 5.0;
};

/**
 * Calculates value for any single asset (player, draft pick, or FAAB).
 */
export const getAssetValue = (
  asset: TradeAsset,
  context: ValuationContext = {}
): number => {
  if (asset.type === "player") {
    return calculatePlayerTradeValue(asset, context);
  }
  if (asset.type === "draft_pick") {
    return getDraftPickValue(
      asset,
      context.currentSeason || new Date().getFullYear(),
      context.dynastyPerspective || "balanced"
    );
  }
  if (asset.type === "faab") {
    return getFaabValue(
      asset.amount,
      context.remainingWeeks ?? 14,
      100
    );
  }
  return 0;
};

/**
 * Calculates package value applying stud consolidation & diminishing returns on multi-player packages.
 */
export const calculatePackageEffectiveValue = (
  assets: TradeAsset[],
  context: ValuationContext = {}
): { rawTotal: number; effectiveTotal: number } => {
  if (assets.length === 0) return { rawTotal: 0, effectiveTotal: 0 };

  const values = assets
    .map((asset) => getAssetValue(asset, context))
    .sort((a, b) => b - a);

  const rawTotal = values.reduce((sum, v) => sum + v, 0);

  // Diminishing returns curve for multi-asset side
  // 1st asset: 100%, 2nd: 88%, 3rd: 76%, 4th+: 62%
  let effectiveTotal = 0;
  values.forEach((val, idx) => {
    let weight = 1.0;
    if (idx === 1) weight = 0.88;
    else if (idx === 2) weight = 0.76;
    else if (idx >= 3) weight = 0.62;
    effectiveTotal += val * weight;
  });

  return {
    rawTotal: Number(rawTotal.toFixed(1)),
    effectiveTotal: Number(effectiveTotal.toFixed(1)),
  };
};

/**
 * Comprehensive trade evaluation engine.
 */
export const evaluateTrade = (
  teamAAssets: TradeAsset[],
  teamBAssets: TradeAsset[],
  context: ValuationContext = {}
): TradeFairnessAssessment => {
  const teamAPackage = calculatePackageEffectiveValue(teamAAssets, context);
  const teamBPackage = calculatePackageEffectiveValue(teamBAssets, context);

  const teamARawValue = teamAPackage.rawTotal;
  const teamBRawValue = teamBPackage.rawTotal;
  const teamAEffectiveValue = teamAPackage.effectiveTotal;
  const teamBEffectiveValue = teamBPackage.effectiveTotal;

  // Value gap calculation
  const maxVal = Math.max(teamAEffectiveValue, teamBEffectiveValue);
  const minVal = Math.min(teamAEffectiveValue, teamBEffectiveValue);
  const valueGap = Number((maxVal - minVal).toFixed(1));
  const valueGapPercent =
    maxVal > 0 ? Number(((valueGap / maxVal) * 100).toFixed(1)) : 0;

  const fairnessScore = Number(Math.max(0, Math.min(100, 100 - valueGapPercent)).toFixed(1));

  // Determine Fairness Label
  let fairnessLabel: FairnessLabel = "Very fair";
  if (valueGapPercent <= 10) {
    fairnessLabel = "Very fair";
  } else if (valueGapPercent <= 20) {
    fairnessLabel = "Fair";
  } else if (valueGapPercent <= 35) {
    fairnessLabel = "Slightly uneven";
  } else {
    fairnessLabel = "Uneven";
  }

  // Determine Favored Side (which manager receives more value)
  // Team A sends teamAAssets, receives teamBAssets
  // Team B sends teamBAssets, receives teamAAssets
  let favoredSide: "team_a" | "team_b" | "even" = "even";
  if (valueGapPercent <= 3.5 || maxVal === 0) {
    favoredSide = "even";
  } else if (teamBEffectiveValue > teamAEffectiveValue) {
    // Team A receives more effective value than they send
    favoredSide = "team_a";
  } else {
    // Team B receives more effective value than they send
    favoredSide = "team_b";
  }

  // Net Gain (from perspective of what each team receives minus what they send)
  const teamANetGain = Number((teamBEffectiveValue - teamAEffectiveValue).toFixed(1));
  const teamBNetGain = Number((teamAEffectiveValue - teamBEffectiveValue).toFixed(1));

  // Calculate points and positional deltas
  const positions = ["QB", "RB", "WR", "TE", "K", "DEF", "PICKS", "FAAB"];
  const initPosDelta = (): PositionalDelta => ({
    incomingCount: 0,
    outgoingCount: 0,
    incomingValue: 0,
    outgoingValue: 0,
    netValue: 0,
    incomingPoints: 0,
    outgoingPoints: 0,
    netPoints: 0,
  });

  const teamAPosDelta: Record<string, PositionalDelta> = {};
  const teamBPosDelta: Record<string, PositionalDelta> = {};
  positions.forEach((p) => {
    teamAPosDelta[p] = initPosDelta();
    teamBPosDelta[p] = initPosDelta();
  });

  let teamAPointsNetGain = 0;
  let teamBPointsNetGain = 0;

  // Process Team A outgoing / Team B incoming
  teamAAssets.forEach((asset) => {
    const val = getAssetValue(asset, context);
    if (asset.type === "player") {
      const pos = (asset.position || "WR").toUpperCase();
      const pts = asset.projectedPoints || 0;
      if (!teamAPosDelta[pos]) teamAPosDelta[pos] = initPosDelta();
      if (!teamBPosDelta[pos]) teamBPosDelta[pos] = initPosDelta();

      teamAPosDelta[pos].outgoingCount += 1;
      teamAPosDelta[pos].outgoingValue += val;
      teamAPosDelta[pos].outgoingPoints += pts;

      teamBPosDelta[pos].incomingCount += 1;
      teamBPosDelta[pos].incomingValue += val;
      teamBPosDelta[pos].incomingPoints += pts;

      teamAPointsNetGain -= pts;
      teamBPointsNetGain += pts;
    } else if (asset.type === "draft_pick") {
      teamAPosDelta.PICKS.outgoingCount += 1;
      teamAPosDelta.PICKS.outgoingValue += val;
      teamBPosDelta.PICKS.incomingCount += 1;
      teamBPosDelta.PICKS.incomingValue += val;
    } else if (asset.type === "faab") {
      teamAPosDelta.FAAB.outgoingCount += 1;
      teamAPosDelta.FAAB.outgoingValue += val;
      teamBPosDelta.FAAB.incomingCount += 1;
      teamBPosDelta.FAAB.incomingValue += val;
    }
  });

  // Process Team B outgoing / Team A incoming
  teamBAssets.forEach((asset) => {
    const val = getAssetValue(asset, context);
    if (asset.type === "player") {
      const pos = (asset.position || "WR").toUpperCase();
      const pts = asset.projectedPoints || 0;
      if (!teamAPosDelta[pos]) teamAPosDelta[pos] = initPosDelta();
      if (!teamBPosDelta[pos]) teamBPosDelta[pos] = initPosDelta();

      teamBPosDelta[pos].outgoingCount += 1;
      teamBPosDelta[pos].outgoingValue += val;
      teamBPosDelta[pos].outgoingPoints += pts;

      teamAPosDelta[pos].incomingCount += 1;
      teamAPosDelta[pos].incomingValue += val;
      teamAPosDelta[pos].incomingPoints += pts;

      teamBPointsNetGain -= pts;
      teamAPointsNetGain += pts;
    } else if (asset.type === "draft_pick") {
      teamBPosDelta.PICKS.outgoingCount += 1;
      teamBPosDelta.PICKS.outgoingValue += val;
      teamAPosDelta.PICKS.incomingCount += 1;
      teamAPosDelta.PICKS.incomingValue += val;
    } else if (asset.type === "faab") {
      teamBPosDelta.FAAB.outgoingCount += 1;
      teamBPosDelta.FAAB.outgoingValue += val;
      teamAPosDelta.FAAB.incomingCount += 1;
      teamAPosDelta.FAAB.incomingValue += val;
    }
  });

  // Compute nets for both teams
  Object.keys(teamAPosDelta).forEach((pos) => {
    const da = teamAPosDelta[pos];
    da.netValue = Number((da.incomingValue - da.outgoingValue).toFixed(1));
    da.netPoints = Number((da.incomingPoints - da.outgoingPoints).toFixed(1));

    const db = teamBPosDelta[pos];
    db.netValue = Number((db.incomingValue - db.outgoingValue).toFixed(1));
    db.netPoints = Number((db.incomingPoints - db.outgoingPoints).toFixed(1));
  });

  // Generate dynamic human summary
  let summary = "";
  if (teamAAssets.length === 0 && teamBAssets.length === 0) {
    summary = "Add assets to both teams to calculate trade valuation.";
  } else if (teamAAssets.length === 0 || teamBAssets.length === 0) {
    summary = "Add assets to both sides of the trade to see full fairness and balance analysis.";
  } else if (favoredSide === "even") {
    summary = `This trade is exceptionally balanced with a ${fairnessScore}% value alignment. Both managers exchange comparable market capital.`;
  } else if (favoredSide === "team_a") {
    summary = `Trade favors Team A by approximately ${valueGapPercent}% (${valueGap} value pts). Team A receives a stronger overall package.`;
  } else {
    summary = `Trade favors Team B by approximately ${valueGapPercent}% (${valueGap} value pts). Team B receives a stronger overall package.`;
  }

  // Recommendations
  const recommendations: string[] = [];
  if (teamAAssets.length > 0 && teamBAssets.length > 0) {
    if (fairnessLabel === "Very fair") {
      recommendations.push("The valuation is balanced; prioritize team positional needs and lineup fit.");
    } else if (fairnessLabel === "Fair") {
      recommendations.push("A minor sweetener (FAAB or late pick) can make this offer irresistible.");
    } else if (fairnessLabel === "Slightly uneven") {
      const trailing = favoredSide === "team_a" ? "Team A" : "Team B";
      recommendations.push(`${trailing} is getting the better deal. Consider adding a draft pick or roster upgrade to balance.`);
    } else {
      const trailing = favoredSide === "team_a" ? "Team A" : "Team B";
      recommendations.push(`Significant value gap favoring ${trailing}. Package requires a substantial asset to balance.`);
    }

    if (Math.abs(teamAPointsNetGain) > 5) {
      const winner = teamAPointsNetGain > 0 ? "Team A" : "Team B";
      recommendations.push(`${winner} gains a noticeable edge in starting fantasy points (+${Math.abs(teamAPointsNetGain).toFixed(1)} pts).`);
    }
  }

  return {
    teamARawValue,
    teamBRawValue,
    teamAEffectiveValue,
    teamBEffectiveValue,
    fairnessScore,
    fairnessLabel,
    favoredSide,
    valueGap,
    valueGapPercent,
    teamANetGain,
    teamBNetGain,
    teamAPointsNetGain: Number(teamAPointsNetGain.toFixed(1)),
    teamBPointsNetGain: Number(teamBPointsNetGain.toFixed(1)),
    netPositionalImpact: {
      teamA: teamAPosDelta,
      teamB: teamBPosDelta,
    },
    summary,
    recommendations,
  };
};

/**
 * Suggests precise ways to balance an uneven trade.
 */
export const calculateTradeBalanceSuggestions = (
  teamAAssets: TradeAsset[],
  teamBAssets: TradeAsset[],
  context: ValuationContext = {},
  availableTeamAAssets: TradeAsset[] = [],
  availableTeamBAssets: TradeAsset[] = []
): BalanceSuggestion | null => {
  const evalResult = evaluateTrade(teamAAssets, teamBAssets, context);
  if (evalResult.valueGap < 3.0 || evalResult.favoredSide === "even") {
    return null;
  }

  // If favoredSide is "team_a", Team A receives more value than they send,
  // so Team A needs to send additional value (or Team B needs to receive more).
  const sideNeedingValue: "team_a" | "team_b" =
    evalResult.favoredSide === "team_a" ? "team_a" : "team_b";

  const deficit = evalResult.valueGap;
  const currentSeason = context.currentSeason || new Date().getFullYear();
  const suggestions: BalanceSuggestion["suggestions"] = [];

  // 1. FAAB suggestion
  const faabPerPt = 10;
  const faabAmount = Math.min(100, Math.max(5, Math.round((deficit / 1.0) * faabPerPt / 10) * 5));
  if (faabAmount > 0 && faabAmount <= 100) {
    suggestions.push({
      type: "faab",
      description: `$${faabAmount} FAAB`,
      value: getFaabValue(faabAmount, context.remainingWeeks ?? 14, 100),
      faabAmount,
    });
  }

  // 2. Draft pick suggestions
  const potentialPicks = [
    { season: currentSeason + 1, round: 1 },
    { season: currentSeason, round: 2 },
    { season: currentSeason + 1, round: 2 },
    { season: currentSeason, round: 3 },
    { season: currentSeason + 1, round: 3 },
    { season: currentSeason, round: 4 },
  ];

  potentialPicks.forEach((pick) => {
    const val = getDraftPickValue(pick, currentSeason, context.dynastyPerspective);
    const diff = Math.abs(val - deficit);
    if (diff <= Math.max(8, deficit * 0.45)) {
      suggestions.push({
        type: "draft_pick",
        description: `${pick.season} Round ${pick.round} Pick`,
        value: val,
        pickSeason: pick.season,
        pickRound: pick.round,
      });
    }
  });

  // 3. Player suggestions from available roster if provided
  const availableRoster =
    sideNeedingValue === "team_a" ? availableTeamAAssets : availableTeamBAssets;

  availableRoster
    .filter((a) => a.type === "player")
    .forEach((playerAsset) => {
      const val = getAssetValue(playerAsset, context);
      const diff = Math.abs(val - deficit);
      if (diff <= Math.max(6, deficit * 0.35) && val > 2) {
        suggestions.push({
          type: "player",
          description: `${(playerAsset as TradePlayerAsset).name} (${(playerAsset as TradePlayerAsset).position})`,
          value: val,
          playerId: playerAsset.id,
          playerName: (playerAsset as TradePlayerAsset).name,
        });
      }
    });

  // Deduplicate and sort suggestions by how close they get to bridging the deficit
  const sortedSuggestions = suggestions
    .sort((a, b) => Math.abs(a.value - deficit) - Math.abs(b.value - deficit))
    .slice(0, 4);

  return {
    sideNeedingValue,
    deficit,
    suggestions: sortedSuggestions,
  };
};

/**
 * Generate an in-depth AI-style trade verdict report.
 */
export const generateTradeVerdict = (
  teamAName: string,
  teamBName: string,
  teamAAssets: TradeAsset[],
  teamBAssets: TradeAsset[],
  context: ValuationContext = {}
): TradeVerdictReport => {
  const assessment = evaluateTrade(teamAAssets, teamBAssets, context);
  const isDynasty =
    context.seasonType === "dynasty" || context.valuationMode === "dynasty";

  const getGrade = (netGain: number): string => {
    if (netGain >= 25) return "A+";
    if (netGain >= 15) return "A";
    if (netGain >= 8) return "A-";
    if (netGain >= 2) return "B+";
    if (netGain >= -2) return "B";
    if (netGain >= -8) return "B-";
    if (netGain >= -15) return "C+";
    if (netGain >= -25) return "C";
    return "D";
  };

  const teamAGrade = getGrade(assessment.teamANetGain);
  const teamBGrade = getGrade(assessment.teamBNetGain);

  let winner = "Even / Win-Win";
  if (assessment.favoredSide === "team_a") {
    winner = teamAName;
  } else if (assessment.favoredSide === "team_b") {
    winner = teamBName;
  }

  // Headline generation
  let headline = "";
  if (assessment.fairnessLabel === "Very fair") {
    headline = `Even Blockbuster: ${teamAName} and ${teamBName} Execute a Textbook Win-Win`;
  } else if (assessment.favoredSide === "team_a") {
    headline = `${teamAName} Lands Significant Value Surplus in Trade with ${teamBName}`;
  } else {
    headline = `${teamBName} Capitalizes on Value Advantage in Deal with ${teamAName}`;
  }

  // Analysis bullets
  const teamAAnalysis: string[] = [];
  const teamBAnalysis: string[] = [];

  const aPlayers = teamAAssets.filter((a): a is TradePlayerAsset => a.type === "player");
  const bPlayers = teamBAssets.filter((a): a is TradePlayerAsset => a.type === "player");
  const aPicks = teamAAssets.filter((a): a is TradeDraftPickAsset => a.type === "draft_pick");
  const bPicks = teamBAssets.filter((a): a is TradeDraftPickAsset => a.type === "draft_pick");

  if (assessment.teamANetGain >= 0) {
    teamAAnalysis.push(`Net market value gain of +${assessment.teamANetGain} points.`);
  } else {
    teamAAnalysis.push(`Sends a slight value premium of ${Math.abs(assessment.teamANetGain)} points to secure key targets.`);
  }

  if (assessment.teamAPointsNetGain !== 0) {
    teamAAnalysis.push(
      assessment.teamAPointsNetGain > 0
        ? `Upgrades weekly starting lineup projection by +${assessment.teamAPointsNetGain} pts.`
        : `Trades away ${Math.abs(assessment.teamAPointsNetGain)} weekly points in exchange for depth or draft capital.`
    );
  }

  if (bPicks.length > 0) {
    teamAAnalysis.push(`Acquires future draft flexibility with ${bPicks.map((p) => `${p.season} R${p.round}`).join(", ")}.`);
  }

  if (assessment.teamBNetGain >= 0) {
    teamBAnalysis.push(`Net market value gain of +${assessment.teamBNetGain} points.`);
  } else {
    teamBAnalysis.push(`Surrenders ${Math.abs(assessment.teamBNetGain)} value points to acquire desired pieces.`);
  }

  if (assessment.teamBPointsNetGain !== 0) {
    teamBAnalysis.push(
      assessment.teamBPointsNetGain > 0
        ? `Upgrades weekly starting lineup projection by +${assessment.teamBPointsNetGain} pts.`
        : `Sacrifices ${Math.abs(assessment.teamBPointsNetGain)} projected points for structural roster benefits.`
    );
  }

  if (aPicks.length > 0) {
    teamBAnalysis.push(`Bolsters future asset pool with ${aPicks.map((p) => `${p.season} R${p.round}`).join(", ")}.`);
  }

  // Verdict narrative
  let verdictText = `This trade yields a fairness score of ${assessment.fairnessScore}% (${assessment.fairnessLabel}). `;
  if (assessment.fairnessLabel === "Very fair") {
    verdictText += `Both sides exchange remarkably balanced value capital. ${teamAName} receives ${bPlayers.map((p) => p.name).join(" and ") || "incoming assets"}, while ${teamBName} acquires ${aPlayers.map((p) => p.name).join(" and ") || "incoming assets"}. The consolidation and positional balance make this deal mutually rewarding.`;
  } else if (assessment.favoredSide === "team_a") {
    verdictText += `${teamAName} clearly walks away with the stronger package, gaining a ${assessment.valueGapPercent}% value advantage. Unless ${teamBName} is filling a desperate starting deficit or acquiring irreplaceable top-end talent, ${teamBName} should request an additional pick or sweetener.`;
  } else {
    verdictText += `${teamBName} captures the value surplus in this exchange with a ${assessment.valueGapPercent}% edge. ${teamAName} is paying a premium, which is only justifiable if acquiring an elite cornerstone player.`;
  }

  if (isDynasty) {
    verdictText += ` In dynasty formats, future pick capital and positional longevity heavily weight long-term franchise trajectory.`;
  }

  const keyTakeaway =
    assessment.fairnessLabel === "Very fair"
      ? "Accept with confidence — this trade improves both rosters cleanly."
      : assessment.favoredSide === "team_a"
        ? `${teamAName} should press accept immediately; ${teamBName} should counter for additional assets.`
        : `${teamBName} should accept quickly; ${teamAName} is overpaying for the incoming pieces.`;

  return {
    headline,
    winner,
    fairnessLabel: assessment.fairnessLabel,
    fairnessScore: assessment.fairnessScore,
    teamAName,
    teamBName,
    teamAGrade,
    teamBGrade,
    verdictText,
    teamAAnalysis,
    teamBAnalysis,
    keyTakeaway,
  };
};
