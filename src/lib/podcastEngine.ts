import type {
  LeagueInfoType,
  PointsType,
  RosterType,
  TradeNameRow,
  UserType,
  WaiverMove,
} from "../types/types";

export const EXCLUSIVE_PODCAST_LEAGUE_ID = "1313895546825490432";
export const EXCLUSIVE_PODCAST_LEAGUE_NAME =
  "Don't you want a fanta fanta fantasy league?";

export type PodcastHostId = "guru" | "comedian" | "reporter";

export type PodcastTone =
  | "analytical"
  | "funny"
  | "breaking"
  | "dramatic"
  | "sarcastic"
  | "excited";

export interface PodcastHostProfile {
  id: PodcastHostId;
  speakerLabel: "Analytical Guru" | "Comedian" | "Beat Reporter";
  characterName: string;
  nickname: string;
  role: string;
  avatar: string;
  catchphrase: string;
  voiceBio: string;
  foilDynamic: string;
  defaultElevenLabsVoiceId: string;
  elevenLabsVoiceDesignPrompt: string;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
  };
}

export interface PodcastPersonas {
  guru: string;
  comedian: string;
  reporter: string;
  presetId?: string;
  guruName?: string;
  comedianName?: string;
  reporterName?: string;
  guruVoiceId?: string;
  comedianVoiceId?: string;
  reporterVoiceId?: string;
}

export interface PodcastShowPreset {
  id: string;
  name: string;
  tagline: string;
  vibe: string;
  personas: PodcastPersonas;
}

export interface PodcastDialogueSegment {
  speaker: "Analytical Guru" | "Comedian" | "Beat Reporter" | string;
  characterName?: string;
  voiceId?: string;
  role?: string;
  avatar?: string;
  text: string;
  tone?: PodcastTone;
  topic?: string;
  act?: string;
}

export interface PodcastActSummary {
  act: string;
  startIndex: number;
  segmentCount: number;
  estimatedMinutes: number;
}

export interface PodcastMatchupFact {
  matchupId: number;
  teamA: string;
  scoreA: number;
  recordA: string;
  teamB: string;
  scoreB: number;
  recordB: string;
  winner: string;
  winnerScore: number;
  loser: string;
  loserScore: number;
  margin: number;
  isClose: boolean;
  isBlowout: boolean;
  winnerTopStarter?: { name: string; points: number };
  loserDudStarter?: { name: string; points: number };
  loserBestBench?: { name: string; points: number };
  benchCostWin: boolean;
}

export interface PodcastWaiverFact {
  manager: string;
  addedPlayer: string;
  position?: string;
  droppedPlayer?: string;
  bid: number | null;
  type: "waiver" | "free_agent";
  week: number;
  startedInWeek: boolean;
  pointsScored: number | null;
}

export interface PodcastTradeFact {
  week: number;
  teamA: string;
  teamAReceived: string[];
  teamB: string;
  teamBReceived: string[];
  summary: string;
}

export interface WeeklyPodcastContext {
  leagueName: string;
  season: string;
  week: number;
  scoringLabel: string;
  totalTeams: number;
  playoffTeams: number;
  leagueMedian: number;
  leagueAverage: number;
  matchups: PodcastMatchupFact[];
  highScorer: { name: string; score: number; opponent: string };
  lowScorer: { name: string; score: number; opponent: string };
  closestGame: PodcastMatchupFact | null;
  biggestBlowout: PodcastMatchupFact | null;
  luckiestWinner: { name: string; score: number; opponent: string } | null;
  unluckiestLoser: { name: string; score: number; opponent: string } | null;
  biggestBenchBlunder: {
    manager: string;
    benchPlayer: string;
    benchPoints: number;
    dudStarter: string;
    dudPoints: number;
    costMatchup: boolean;
    margin: number;
  } | null;
  waivers: PodcastWaiverFact[];
  trades: PodcastTradeFact[];
  standingsTop: Array<{ rank: number; name: string; record: string; pf: number }>;
  standingsBubble: Array<{ rank: number; name: string; record: string; pf: number }>;
  sackoFrontrunner: { rank: number; name: string; record: string; pf: number } | null;
  mostActiveManager: { name: string; moves: number } | null;
  leastActiveManager: { name: string; moves: number } | null;
}

export interface RichPodcastEpisode {
  title: string;
  subtitle: string;
  week: number;
  leagueName: string;
  summary: string;
  highlights: string[];
  segments: PodcastDialogueSegment[];
  script: Array<{ speaker: string; text: string; tone?: string }>;
  acts: PodcastActSummary[];
  wordCount: number;
  estimatedDurationMinutes: number;
  generatedAt: string;
  isFallback?: boolean;
  isMock?: boolean;
}

export type PlayerLookupRecord = Record<
  string,
  { name?: string; position?: string; team?: string }
>;

export const PODCAST_CAST_PROFILES: Record<PodcastHostId, PodcastHostProfile> = {
  guru: {
    id: "guru",
    speakerLabel: "Analytical Guru",
    characterName: 'Spencer "Dr. Metric" Vance',
    nickname: "TurboTax",
    role: "Sabermetrics, Expected Points & Fraud Detection",
    avatar: "/avatars/avatar1.svg",
    catchphrase: "Statistically speaking, that lineup is a felony.",
    voiceBio:
      "A stat-obsessed former quant nerd ('Dr. Metric') who analyzes expected points, all-play win rates, air yards, lineup efficiency, and VORP, getting visibly offended whenever a lucky team wins on a fluke kicker boom.",
    foilDynamic:
      "Gets roasted by Johnny as 'TurboTax' whenever he cites standard deviations; treats Scoop's group-chat rumors as unverified small-sample noise.",
    // Custom ElevenLabs Creative Voice for Spencer "Dr. Metric" Vance
    defaultElevenLabsVoiceId: "c6SfcYrb2t09NHXiT80T",
    elevenLabsVoiceDesignPrompt:
      "Early-30s sharp, fast-talking male quantitative sports analyst with crisp diction, slightly nasal Ivy-League cadence, and dry exasperated comedic timing when interrupted.",
    voiceSettings: { stability: 0.45, similarityBoost: 0.8, style: 0.35 },
  },
  comedian: {
    id: "comedian",
    speakerLabel: "Comedian",
    characterName: 'Johnny "Two-Screens" Russo',
    nickname: "Johnny Trash-Talk",
    role: "Savage Roasts, Bench Crimes & Sacko Police",
    avatar: "/avatars/avatar2.svg",
    catchphrase: "Delete the app and apologize to your bloodline!",
    voiceBio:
      "A ruthless, hilarious morning-zoo shock jock and RedZone degenerate ('Johnny Two-Screens') who brings brutal adult trash talk, roasts bad start/sit decisions, mocks FAAB panic bids, and buries blowout losers.",
    foilDynamic:
      "Constantly interrupts Dr. Metric's math lectures to dunk on whoever scored the fewest points; eggs Scoop on whenever there is waiver-wire or trade drama.",
    // Custom ElevenLabs Creative Voice for Johnny "Two-Screens" Russo
    defaultElevenLabsVoiceId: "GorLj2SsI4u2JqL58gAA",
    elevenLabsVoiceDesignPrompt:
      "Late-30s high-energy East Coast sports-radio comic with a warm, slightly raspy baritone, infectious laugh-ready delivery, dramatic emphasis, and rapid-fire roast timing.",
    voiceSettings: { stability: 0.3, similarityBoost: 0.75, style: 0.65 },
  },
  reporter: {
    id: "reporter",
    speakerLabel: "Beat Reporter",
    characterName: '"Scoop" Sullivan',
    nickname: "Scoop",
    role: "Breaking Wire, Locker Room Leaks & Trade Desk",
    avatar: "/avatars/avatar3.svg",
    catchphrase: "Per multiple screenshots inside the group chat...",
    voiceBio:
      "An over-caffeinated NFL-insider parody ('Scoop Sullivan') who reports 3 AM waiver claims, FAAB overpays, injury panic, and lopsided trade DMs like breaking Pentagon leaks.",
    foilDynamic:
      "Anchors the 6-act broadcast with deadpan urgency while tossing live grenades between Spencer's spreadsheet and Johnny's flamethrower.",
    // Custom ElevenLabs Creative Voice for "Scoop" Sullivan
    defaultElevenLabsVoiceId: "qA5SHJ9UjGlW2QwXWR7w",
    elevenLabsVoiceDesignPrompt:
      "Mid-40s polished, urgent network football insider with authoritative broadcast baritone projection, crisp pacing, and deadpan breaking-news gravitas.",
    voiceSettings: { stability: 0.55, similarityBoost: 0.85, style: 0.4 },
  },
};

export const DEFAULT_PODCAST_PERSONAS: PodcastPersonas = {
  guru: PODCAST_CAST_PROFILES.guru.voiceBio,
  comedian: PODCAST_CAST_PROFILES.comedian.voiceBio,
  reporter: PODCAST_CAST_PROFILES.reporter.voiceBio,
  presetId: "flagship",
  guruName: PODCAST_CAST_PROFILES.guru.characterName,
  comedianName: PODCAST_CAST_PROFILES.comedian.characterName,
  reporterName: PODCAST_CAST_PROFILES.reporter.characterName,
  guruVoiceId: PODCAST_CAST_PROFILES.guru.defaultElevenLabsVoiceId,
  comedianVoiceId: PODCAST_CAST_PROFILES.comedian.defaultElevenLabsVoiceId,
  reporterVoiceId: PODCAST_CAST_PROFILES.reporter.defaultElevenLabsVoiceId,
};

export const PODCAST_SHOW_PRESETS: PodcastShowPreset[] = [
  {
    id: "flagship",
    name: "98.7 The Fantasy Degenerates",
    tagline: "Pardon My Take meets RedZone Witching Hour",
    vibe: "Fast-paced chemistry: sharp analytics, savage roasts, and breathless insider leaks.",
    personas: { ...DEFAULT_PODCAST_PERSONAS, presetId: "flagship" },
  },
  {
    id: "roast",
    name: "3 AM Waiver Confessional",
    tagline: "Uncensored Late-Night Roast Table",
    vibe: "Maximum comedic carnage aimed at low scorers, FAAB lighting-money-on-fire bids, and bench blunders.",
    personas: {
      presetId: "roast",
      guruName: 'Spencer "The coroner" Vance',
      comedianName: 'Johnny "No Mercy" Russo',
      reporterName: 'Scoop "Receipts" Sullivan',
      guru: "A cold-blooded forensic stat coroner who uses efficiency metrics and all-play math strictly to prove why your roster is dead on arrival.",
      comedian:
        "An unhinged stand-up roast comic who treats every sub-100 fantasy score, zero-point starter, and wasted FAAB dollar like a public shaming.",
      reporter:
        "A tabloid investigative insider reading leaked 2 AM trade rejections and Sunday 12:58 PM panic tinker receipts live on air.",
    },
  },
  {
    id: "front_office",
    name: "Sunday Morning War Room",
    tagline: "Moneyball Quant vs. Old-School Gut vs. League Insider",
    vibe: "High-IQ playoff leverage debates mixed with classic football-guy clichés and transaction grades.",
    personas: {
      presetId: "front_office",
      guruName: 'Dr. Spencer "VORP" Vance',
      comedianName: 'Coach Johnny "Gut Feel" Russo',
      reporterName: '"Insider" Scoop Sullivan',
      guru: "A stat-obsessed front-office capologist obsessed with Monte Carlo playoff equity, schedule strength, and roster construction.",
      comedian:
        "A hilarious, gravelly old-school football guy who hates spreadsheets, worships bellcow running backs, and ruthlessly mocks soft finesse lineups.",
      reporter:
        "A plugged-in league beat writer tracking trade block rumors, waiver priority chess, and locker-room morale.",
    },
  },
];

function getScoringLabel(leagueInfo?: Partial<LeagueInfoType> | null): string {
  if (!leagueInfo) return "PPR";
  const rec = leagueInfo.scoringSettings?.rec;
  if (rec === 1 || leagueInfo.scoringType === 1) return "Full PPR";
  if (rec === 0.5 || leagueInfo.scoringType === 2) return "Half PPR";
  if (rec === 0) return "Standard";
  return "Fantasy";
}

function resolveUserDisplayName(
  roster: Partial<RosterType> | undefined,
  users: UserType[] | undefined,
  fallbackId: number
): string {
  if (!roster) return `Team ${fallbackId}`;
  const user = users?.find((u) => u.id === roster.id);
  return user?.name || user?.username || `Team ${roster.rosterId ?? fallbackId}`;
}

function resolvePlayerLabel(
  playerId: string | null | undefined,
  playerMap?: PlayerLookupRecord
): string {
  if (!playerId || playerId === "0") return "Empty Slot";
  const found = playerMap?.[playerId];
  if (found?.name) {
    return found.position ? `${found.name} (${found.position})` : found.name;
  }
  if (/^[A-Z]{2,3}$/.test(playerId)) {
    return `${playerId} D/ST`;
  }
  return `Player #${playerId}`;
}

function computeCumulativeRecord(
  roster: Partial<RosterType> | undefined,
  week: number
): string {
  if (!roster) return "0-0";
  if (roster.recordByWeek && roster.recordByWeek.length >= week) {
    const slice = roster.recordByWeek.slice(0, week);
    let w = 0;
    let l = 0;
    let t = 0;
    for (const ch of slice) {
      if (ch === "W") w += 1;
      else if (ch === "L") l += 1;
      else if (ch === "T") t += 1;
    }
    if (w + l + t > 0) {
      return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
    }
  }
  const wins = roster.wins ?? 0;
  const losses = roster.losses ?? 0;
  const ties = roster.ties ?? 0;
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function extractWeeklyPodcastFacts(params: {
  leagueInfo?: Partial<LeagueInfoType> | null;
  matchupsData?: unknown;
  week?: number;
  playerMap?: PlayerLookupRecord;
}): WeeklyPodcastContext {
  const { leagueInfo, matchupsData, playerMap } = params;
  const leagueName = leagueInfo?.name || "The League";
  const season = String(leagueInfo?.season || "2026");
  const rawWeek =
    params.week ||
    leagueInfo?.lastScoredWeek ||
    leagueInfo?.currentWeek ||
    10;
  const week = Math.max(1, Number(rawWeek) || 10);
  const weekIndex = week - 1;
  const users = leagueInfo?.users ?? [];
  const rosters = leagueInfo?.rosters ?? [];
  const weeklyPoints: PointsType[] = Array.isArray(leagueInfo?.weeklyPoints)
    ? leagueInfo.weeklyPoints
    : Array.isArray(matchupsData) &&
        matchupsData.length > 0 &&
        typeof matchupsData[0] === "object" &&
        matchupsData[0] !== null &&
        "rosterId" in (matchupsData[0] as Record<string, unknown>)
      ? (matchupsData as PointsType[])
      : [];

  const rosterById = new Map<number, RosterType>();
  for (const r of rosters) {
    rosterById.set(r.rosterId, r);
  }

  const parsedMatchups: PodcastMatchupFact[] = [];

  // Path 1: Explicit { team1, score1, team2, score2 } array passed in tests/custom calls
  if (
    Array.isArray(matchupsData) &&
    matchupsData.length > 0 &&
    typeof matchupsData[0] === "object" &&
    matchupsData[0] !== null &&
    "team1" in (matchupsData[0] as Record<string, unknown>)
  ) {
    let idx = 1;
    for (const raw of matchupsData as Array<Record<string, any>>) {
      const teamA = String(raw.team1?.name ?? raw.team1 ?? `Team ${idx * 2 - 1}`);
      const scoreA = Number(raw.team1?.points ?? raw.score1 ?? 0);
      const teamB = String(raw.team2?.name ?? raw.team2 ?? `Team ${idx * 2}`);
      const scoreB = Number(raw.team2?.points ?? raw.score2 ?? 0);
      const aWon = scoreA >= scoreB;
      const margin = Number(Math.abs(scoreA - scoreB).toFixed(2));
      parsedMatchups.push({
        matchupId: idx,
        teamA,
        scoreA: Number(scoreA.toFixed(2)),
        recordA: String(raw.record1 ?? "6-4"),
        teamB,
        scoreB: Number(scoreB.toFixed(2)),
        recordB: String(raw.record2 ?? "5-5"),
        winner: aWon ? teamA : teamB,
        winnerScore: Number((aWon ? scoreA : scoreB).toFixed(2)),
        loser: aWon ? teamB : teamA,
        loserScore: Number((aWon ? scoreB : scoreA).toFixed(2)),
        margin,
        isClose: margin <= 6,
        isBlowout: margin >= 30,
        benchCostWin: false,
      });
      idx += 1;
    }
  }

  // Path 2: Real Sleeper / ESPN weeklyPoints grouped by matchupId for weekIndex
  if (parsedMatchups.length === 0 && weeklyPoints.length >= 2) {
    const byMatchupId = new Map<number, PointsType[]>();
    const ungrouped: PointsType[] = [];

    for (const entry of weeklyPoints) {
      const mId = entry.matchups?.[weekIndex];
      if (typeof mId === "number" && mId > 0) {
        const group = byMatchupId.get(mId) ?? [];
        group.push(entry);
        byMatchupId.set(mId, group);
      } else {
        ungrouped.push(entry);
      }
    }

    const pairs: Array<[PointsType, PointsType, number]> = [];
    for (const [mId, entries] of byMatchupId.entries()) {
      if (entries.length >= 2) {
        pairs.push([entries[0], entries[1], mId]);
      } else if (entries.length === 1) {
        ungrouped.push(entries[0]);
      }
    }
    for (let i = 0; i + 1 < ungrouped.length; i += 2) {
      pairs.push([ungrouped[i], ungrouped[i + 1], pairs.length + 1]);
    }

    const inspectRosterWeek = (entry: PointsType) => {
      const starters = entry.starters?.[weekIndex] ?? [];
      const starterPts = entry.starterPoints?.[weekIndex] ?? [];
      const starterNamesRow = entry.starterNames?.[weekIndex] ?? [];
      const benchIds = entry.benchPlayers?.[weekIndex] ?? [];
      const benchPts = entry.benchPoints?.[weekIndex] ?? [];
      const benchNamesRow = entry.benchNames?.[weekIndex] ?? [];

      let topStarter: { name: string; points: number } | undefined;
      let dudStarter: { name: string; points: number } | undefined;

      for (let i = 0; i < starterPts.length; i += 1) {
        const pts = Number(starterPts[i] ?? 0);
        const namedObj = starterNamesRow[i];
        const label =
          (namedObj && typeof namedObj === "object" && namedObj.name
            ? `${namedObj.name}${namedObj.position ? ` (${namedObj.position})` : ""}`
            : undefined) ?? resolvePlayerLabel(starters[i], playerMap);

        if (!topStarter || pts > topStarter.points) {
          topStarter = { name: label, points: Number(pts.toFixed(2)) };
        }
        if (!dudStarter || pts < dudStarter.points) {
          dudStarter = { name: label, points: Number(pts.toFixed(2)) };
        }
      }

      let bestBench: { name: string; points: number } | undefined;
      for (let i = 0; i < benchPts.length; i += 1) {
        const pts = Number(benchPts[i] ?? 0);
        const namedObj = benchNamesRow[i];
        const label =
          (namedObj && typeof namedObj === "object" && namedObj.name
            ? `${namedObj.name}${namedObj.position ? ` (${namedObj.position})` : ""}`
            : undefined) ?? resolvePlayerLabel(benchIds[i], playerMap);
        if (!bestBench || pts > bestBench.points) {
          bestBench = { name: label, points: Number(pts.toFixed(2)) };
        }
      }

      return { topStarter, dudStarter, bestBench };
    };

    for (const [entryA, entryB, mId] of pairs) {
      const rosterA = rosterById.get(entryA.rosterId);
      const rosterB = rosterById.get(entryB.rosterId);
      const teamA = resolveUserDisplayName(rosterA, users, entryA.rosterId);
      const teamB = resolveUserDisplayName(rosterB, users, entryB.rosterId);
      const scoreA = Number((entryA.points?.[weekIndex] ?? 0).toFixed(2));
      const scoreB = Number((entryB.points?.[weekIndex] ?? 0).toFixed(2));
      if (scoreA === 0 && scoreB === 0) continue;

      const detailA = inspectRosterWeek(entryA);
      const detailB = inspectRosterWeek(entryB);
      const aWon = scoreA >= scoreB;
      const margin = Number(Math.abs(scoreA - scoreB).toFixed(2));
      const winnerDetail = aWon ? detailA : detailB;
      const loserDetail = aWon ? detailB : detailA;

      const benchGain =
        loserDetail.bestBench && loserDetail.dudStarter
          ? loserDetail.bestBench.points - loserDetail.dudStarter.points
          : 0;

      parsedMatchups.push({
        matchupId: mId,
        teamA,
        scoreA,
        recordA: computeCumulativeRecord(rosterA, week),
        teamB,
        scoreB,
        recordB: computeCumulativeRecord(rosterB, week),
        winner: aWon ? teamA : teamB,
        winnerScore: aWon ? scoreA : scoreB,
        loser: aWon ? teamB : teamA,
        loserScore: aWon ? scoreB : scoreA,
        margin,
        isClose: margin <= 6,
        isBlowout: margin >= 30,
        winnerTopStarter: winnerDetail.topStarter,
        loserDudStarter: loserDetail.dudStarter,
        loserBestBench: loserDetail.bestBench,
        benchCostWin: margin > 0 && benchGain > margin,
      });
    }
  }

  // Fallback only if zero league/matchup data was passed at all
  if (parsedMatchups.length === 0) {
    parsedMatchups.push(
      {
        matchupId: 1,
        teamA: "Touchdown Titans",
        scoreA: 148.6,
        recordA: "8-2",
        teamB: "Gridiron Gladiators",
        scoreB: 146.8,
        recordB: "7-3",
        winner: "Touchdown Titans",
        winnerScore: 148.6,
        loser: "Gridiron Gladiators",
        loserScore: 146.8,
        margin: 1.8,
        isClose: true,
        isBlowout: false,
        winnerTopStarter: { name: "Ja'Marr Chase (WR)", points: 34.2 },
        loserDudStarter: { name: "Kyle Pitts (TE)", points: 2.1 },
        loserBestBench: { name: "Jaylen Warren (RB)", points: 19.4 },
        benchCostWin: true,
      },
      {
        matchupId: 2,
        teamA: "Redzone Renegades",
        scoreA: 154.2,
        recordA: "7-3",
        teamB: "Waiver Wire Wonders",
        scoreB: 79.4,
        recordB: "2-8",
        winner: "Redzone Renegades",
        winnerScore: 154.2,
        loser: "Waiver Wire Wonders",
        loserScore: 79.4,
        margin: 74.8,
        isClose: false,
        isBlowout: true,
        winnerTopStarter: { name: "Bijan Robinson (RB)", points: 29.8 },
        loserDudStarter: { name: "Gabe Davis (WR)", points: 0.0 },
        loserBestBench: { name: "rashid Shaheed (WR)", points: 16.5 },
        benchCostWin: false,
      },
      {
        matchupId: 3,
        teamA: "Sunday Couch GMs",
        scoreA: 112.4,
        recordA: "6-4",
        teamB: "Bye Week Victims",
        scoreB: 108.9,
        recordB: "4-6",
        winner: "Sunday Couch GMs",
        winnerScore: 112.4,
        loser: "Bye Week Victims",
        loserScore: 108.9,
        margin: 3.5,
        isClose: true,
        isBlowout: false,
        benchCostWin: false,
      }
    );
  }

  // Compute scores, median, average, superlatives
  const allTeamPerformances: Array<{
    name: string;
    score: number;
    opponent: string;
    won: boolean;
  }> = [];
  for (const m of parsedMatchups) {
    const aWon = m.winner === m.teamA;
    allTeamPerformances.push({
      name: m.teamA,
      score: m.scoreA,
      opponent: m.teamB,
      won: aWon,
    });
    allTeamPerformances.push({
      name: m.teamB,
      score: m.scoreB,
      opponent: m.teamA,
      won: !aWon,
    });
  }

  const sortedByScoreDesc = [...allTeamPerformances].sort(
    (a, b) => b.score - a.score
  );
  const highPerf = sortedByScoreDesc[0];
  const lowPerf = sortedByScoreDesc[sortedByScoreDesc.length - 1];

  const mid = Math.floor(sortedByScoreDesc.length / 2);
  const leagueMedian =
    sortedByScoreDesc.length % 2 === 0
      ? Number(
          (
            (sortedByScoreDesc[mid - 1].score + sortedByScoreDesc[mid].score) /
            2
          ).toFixed(2)
        )
      : sortedByScoreDesc[mid].score;

  const leagueAverage = Number(
    (
      sortedByScoreDesc.reduce((sum, p) => sum + p.score, 0) /
      Math.max(1, sortedByScoreDesc.length)
    ).toFixed(2)
  );

  let closestGame: PodcastMatchupFact | null = null;
  let biggestBlowout: PodcastMatchupFact | null = null;
  let biggestBenchBlunder: WeeklyPodcastContext["biggestBenchBlunder"] = null;

  for (const m of parsedMatchups) {
    if (!closestGame || m.margin < closestGame.margin) closestGame = m;
    if (!biggestBlowout || m.margin > biggestBlowout.margin) biggestBlowout = m;

    if (m.loserBestBench && m.loserDudStarter) {
      const diff = m.loserBestBench.points - m.loserDudStarter.points;
      if (
        diff >= 8 &&
        (!biggestBenchBlunder ||
          (m.benchCostWin && !biggestBenchBlunder.costMatchup) ||
          diff >
            biggestBenchBlunder.benchPoints - biggestBenchBlunder.dudPoints)
      ) {
        biggestBenchBlunder = {
          manager: m.loser,
          benchPlayer: m.loserBestBench.name,
          benchPoints: m.loserBestBench.points,
          dudStarter: m.loserDudStarter.name,
          dudPoints: m.loserDudStarter.points,
          costMatchup: m.benchCostWin,
          margin: m.margin,
        };
      }
    }
  }

  const winnersAsc = [...allTeamPerformances]
    .filter((p) => p.won)
    .sort((a, b) => a.score - b.score);
  const losersDesc = [...allTeamPerformances]
    .filter((p) => !p.won)
    .sort((a, b) => b.score - a.score);

  const luckiestWinner =
    winnersAsc[0] && winnersAsc[0].score < leagueMedian
      ? {
          name: winnersAsc[0].name,
          score: winnersAsc[0].score,
          opponent: winnersAsc[0].opponent,
        }
      : winnersAsc[0]
        ? {
            name: winnersAsc[0].name,
            score: winnersAsc[0].score,
            opponent: winnersAsc[0].opponent,
          }
        : null;

  const unluckiestLoser =
    losersDesc[0] && losersDesc[0].score > leagueMedian
      ? {
          name: losersDesc[0].name,
          score: losersDesc[0].score,
          opponent: losersDesc[0].opponent,
        }
      : losersDesc[0]
        ? {
            name: losersDesc[0].name,
            score: losersDesc[0].score,
            opponent: losersDesc[0].opponent,
          }
        : null;

  // Extract Real Waivers / FAAB Moves
  const waivers: PodcastWaiverFact[] = [];
  const checkStartedPoints = (
    rosterId: number,
    playerId: string
  ): { started: boolean; points: number | null } => {
    const wp = weeklyPoints.find((p) => p.rosterId === rosterId);
    if (!wp) return { started: false, points: null };
    const starters = wp.starters?.[weekIndex] ?? [];
    const sIdx = starters.indexOf(playerId);
    if (sIdx !== -1) {
      return {
        started: true,
        points: Number((wp.starterPoints?.[weekIndex]?.[sIdx] ?? 0).toFixed(2)),
      };
    }
    const bench = wp.benchPlayers?.[weekIndex] ?? [];
    const bIdx = bench.indexOf(playerId);
    if (bIdx !== -1) {
      return {
        started: false,
        points: Number((wp.benchPoints?.[weekIndex]?.[bIdx] ?? 0).toFixed(2)),
      };
    }
    return { started: false, points: null };
  };

  if (Array.isArray(leagueInfo?.waiverMoves) && leagueInfo.waiverMoves.length > 0) {
    const exactWeek = leagueInfo.waiverMoves.filter((w) => w.week === week);
    const pool: WaiverMove[] =
      exactWeek.length >= 2
        ? exactWeek
        : leagueInfo.waiverMoves.filter((w) => Math.abs(w.week - week) <= 2);

    for (const move of pool.slice(0, 6)) {
      const rId = Number(move.id) || 0;
      const usage = checkStartedPoints(rId, move.player_id);
      waivers.push({
        manager: move.user?.name || move.user?.username || `Team ${rId}`,
        addedPlayer: move.position
          ? `${move.adds} (${move.position})`
          : move.adds,
        position: move.position,
        bid: move.bid,
        type: move.bid !== null && move.bid > 0 ? "waiver" : "free_agent",
        week: move.week,
        startedInWeek: usage.started,
        pointsScored: usage.points,
      });
    }
  } else if (Array.isArray(leagueInfo?.waivers) && leagueInfo.waivers.length > 0) {
    const completed = leagueInfo.waivers.filter(
      (w) => w.status === "complete" && w.adds
    );
    const exactWeek = completed.filter((w) => w.leg === week);
    const pool =
      exactWeek.length >= 2
        ? exactWeek
        : completed.filter((w) => Math.abs(w.leg - week) <= 2);

    const sortedPool = [...pool].sort(
      (a, b) => (b.settings?.waiver_bid ?? 0) - (a.settings?.waiver_bid ?? 0)
    );

    for (const w of sortedPool.slice(0, 6)) {
      const rId = w.roster_ids?.[0] ?? 0;
      const addedId = w.adds ? Object.keys(w.adds)[0] : "";
      if (!addedId) continue;
      const droppedId = w.drops ? Object.keys(w.drops)[0] : undefined;
      const roster = rosterById.get(rId);
      const usage = checkStartedPoints(rId, addedId);
      waivers.push({
        manager: resolveUserDisplayName(roster, users, rId),
        addedPlayer: resolvePlayerLabel(addedId, playerMap),
        droppedPlayer: droppedId
          ? resolvePlayerLabel(droppedId, playerMap)
          : undefined,
        bid: w.settings?.waiver_bid ?? null,
        type: w.type === "waiver" ? "waiver" : "free_agent",
        week: w.leg,
        startedInWeek: usage.started,
        pointsScored: usage.points,
      });
    }
  }

  // Extract Real Trades
  const trades: PodcastTradeFact[] = [];
  if (Array.isArray(leagueInfo?.tradeNames) && leagueInfo.tradeNames.length > 0) {
    const exact = leagueInfo.tradeNames.filter(
      (t) => t.team1.week === week || t.team2.week === week
    );
    const pool: TradeNameRow[] =
      exact.length > 0 ? exact : leagueInfo.tradeNames.slice(0, 3);
    for (const t of pool.slice(0, 4)) {
      const teamA = t.team1.user.name || t.team1.user.username || "Manager A";
      const teamB = t.team2.user.name || t.team2.user.username || "Manager B";
      const aGot = [
        ...t.team1.players,
        ...t.team1.draftPicks.map((p) => `${p.season} Rd ${p.round}`),
      ];
      const bGot = [
        ...t.team2.players,
        ...t.team2.draftPicks.map((p) => `${p.season} Rd ${p.round}`),
      ];
      const tradeWeek = t.team1.week ?? week;
      trades.push({
        week: tradeWeek,
        teamA,
        teamAReceived: aGot,
        teamB,
        teamBReceived: bGot,
        summary: `Week ${tradeWeek}: ${teamA} acquired ${aGot.join(", ") || "assets"} from ${teamB} for ${bGot.join(", ") || "assets"}`,
      });
    }
  } else if (Array.isArray(leagueInfo?.trades) && leagueInfo.trades.length > 0) {
    const exact = leagueInfo.trades.filter((t) => t.leg === week);
    const pool = exact.length > 0 ? exact : leagueInfo.trades.slice(0, 3);
    for (const t of pool.slice(0, 4)) {
      const [rA, rB] = t.roster_ids ?? [];
      if (!rA || !rB) continue;
      const teamA = resolveUserDisplayName(rosterById.get(rA), users, rA);
      const teamB = resolveUserDisplayName(rosterById.get(rB), users, rB);
      const aGot: string[] = [];
      const bGot: string[] = [];
      if (t.adds) {
        for (const [pId, ownerId] of Object.entries(t.adds)) {
          if (ownerId === rA) aGot.push(resolvePlayerLabel(pId, playerMap));
          else if (ownerId === rB) bGot.push(resolvePlayerLabel(pId, playerMap));
        }
      }
      trades.push({
        week: t.leg,
        teamA,
        teamAReceived: aGot,
        teamB,
        teamBReceived: bGot,
        summary: `Week ${t.leg}: ${teamA} acquired ${aGot.join(", ") || "draft capital"} from ${teamB} in exchange for ${bGot.join(", ") || "draft capital"}`,
      });
    }
  }

  // Standings & Activity Ranks
  const sortedStandings = [...rosters]
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    })
    .map((r, idx) => ({
      rank: idx + 1,
      name: resolveUserDisplayName(r, users, r.rosterId),
      record: computeCumulativeRecord(r, week),
      pf: Number((r.pointsFor ?? 0).toFixed(1)),
    }));

  const playoffTeams = leagueInfo?.playoffTeams || 6;
  const standingsTop = sortedStandings.slice(0, 3);
  const standingsBubble = sortedStandings.slice(
    Math.max(0, playoffTeams - 2),
    Math.min(sortedStandings.length, playoffTeams + 2)
  );
  const sackoFrontrunner =
    sortedStandings.length > 0
      ? sortedStandings[sortedStandings.length - 1]
      : null;

  let mostActiveManager: { name: string; moves: number } | null = null;
  let leastActiveManager: { name: string; moves: number } | null = null;
  if (leagueInfo?.transactions && Object.keys(leagueInfo.transactions).length > 0) {
    const entries = Object.entries(leagueInfo.transactions)
      .map(([userId, count]) => {
        const user = users.find((u) => u.id === userId);
        return {
          name: user?.name || user?.username || userId,
          moves: Number(count) || 0,
        };
      })
      .sort((a, b) => b.moves - a.moves);
    if (entries.length > 0) {
      mostActiveManager = entries[0];
      leastActiveManager = entries[entries.length - 1];
    }
  }

  return {
    leagueName,
    season,
    week,
    scoringLabel: getScoringLabel(leagueInfo),
    totalTeams: leagueInfo?.totalRosters || Math.max(parsedMatchups.length * 2, 10),
    playoffTeams,
    leagueMedian,
    leagueAverage,
    matchups: parsedMatchups,
    highScorer: {
      name: highPerf.name,
      score: highPerf.score,
      opponent: highPerf.opponent,
    },
    lowScorer: {
      name: lowPerf.name,
      score: lowPerf.score,
      opponent: lowPerf.opponent,
    },
    closestGame,
    biggestBlowout,
    luckiestWinner,
    unluckiestLoser,
    biggestBenchBlunder,
    waivers,
    trades,
    standingsTop,
    standingsBubble,
    sackoFrontrunner,
    mostActiveManager,
    leastActiveManager,
  };
}

export function summarizePodcastMetrics(segments: PodcastDialogueSegment[]): {
  wordCount: number;
  estimatedDurationMinutes: number;
  acts: PodcastActSummary[];
} {
  const totalWords = segments.reduce(
    (sum, seg) => sum + seg.text.trim().split(/\s+/).filter(Boolean).length,
    0
  );
  // Spoken sports-talk cadence with natural pauses is ~145 words/min
  const rawMinutes = totalWords / 145;
  const estimatedDurationMinutes = Number(Math.max(1, rawMinutes).toFixed(1));

  const actMap = new Map<
    string,
    { startIndex: number; segmentCount: number; words: number }
  >();
  segments.forEach((seg, idx) => {
    const actName = seg.act || "Main Broadcast";
    const existing = actMap.get(actName);
    const words = seg.text.trim().split(/\s+/).filter(Boolean).length;
    if (!existing) {
      actMap.set(actName, { startIndex: idx, segmentCount: 1, words });
    } else {
      existing.segmentCount += 1;
      existing.words += words;
    }
  });

  const acts: PodcastActSummary[] = Array.from(actMap.entries()).map(
    ([act, info]) => ({
      act,
      startIndex: info.startIndex,
      segmentCount: info.segmentCount,
      estimatedMinutes: Number(Math.max(0.5, info.words / 145).toFixed(1)),
    })
  );

  return { wordCount: totalWords, estimatedDurationMinutes, acts };
}

/**
 * Deterministic 6-Act, 8-10 Minute (~1,350-1,600 word) Comedy Sports Radio Generator
 * Uses 100% real league matchups, bench blunders, waivers/FAAB, trades, and standings.
 */
export function generateStudioPodcastEpisode(params: {
  leagueInfo?: Partial<LeagueInfoType> | null;
  matchupsData?: unknown;
  personas?: Partial<PodcastPersonas>;
  week?: number;
  topic?: string;
  playerMap?: PlayerLookupRecord;
  isMock?: boolean;
}): RichPodcastEpisode {
  const mergedPersonas: PodcastPersonas = {
    ...DEFAULT_PODCAST_PERSONAS,
    ...(params.personas || {}),
  };
  const guruName =
    mergedPersonas.guruName || PODCAST_CAST_PROFILES.guru.characterName;
  const comedianName =
    mergedPersonas.comedianName || PODCAST_CAST_PROFILES.comedian.characterName;
  const reporterName =
    mergedPersonas.reporterName || PODCAST_CAST_PROFILES.reporter.characterName;

  const ctx = extractWeeklyPodcastFacts({
    leagueInfo: params.leagueInfo,
    matchupsData: params.matchupsData,
    week: params.week,
    playerMap: params.playerMap,
  });

  const segments: PodcastDialogueSegment[] = [];
  const pushLine = (
    host: PodcastHostId,
    tone: PodcastTone,
    act: string,
    topic: string,
    text: string
  ) => {
    const profile = PODCAST_CAST_PROFILES[host];
    const characterName =
      host === "guru"
        ? guruName
        : host === "comedian"
          ? comedianName
          : reporterName;
    const voiceId =
      host === "guru"
        ? mergedPersonas.guruVoiceId || profile.defaultElevenLabsVoiceId
        : host === "comedian"
          ? mergedPersonas.comedianVoiceId || profile.defaultElevenLabsVoiceId
          : mergedPersonas.reporterVoiceId || profile.defaultElevenLabsVoiceId;
    segments.push({
      speaker: profile.speakerLabel,
      characterName,
      voiceId,
      role: `${characterName} • ${profile.role}`,
      avatar: profile.avatar,
      tone,
      act,
      topic,
      text,
    });
  };

  // =========================================================================
  // ACT I: COLD OPEN & HEADLINE CHAOS
  // =========================================================================
  const act1 = "Act I: Cold Open & Headline Chaos";
  pushLine(
    "reporter",
    "breaking",
    act1,
    "Show Kickoff",
    `Turn up your headphones and hide your waiver claims—welcome back to ${ctx.leagueName} Radio, Episode ${ctx.week} of the ${ctx.season} ${ctx.scoringLabel} campaign! I'm ${reporterName} live at the news desk alongside forensic numbers psycho ${guruName} and resident chaos merchant ${comedianName}. Gentlemen, Week ${ctx.week} didn't just separate contenders from pretenders—it left crime scene tape wrapped around half this ${ctx.totalTeams}-team league. The league-wide scoring average landed at ${ctx.leagueAverage.toFixed(1)} points with a median of ${ctx.leagueMedian.toFixed(1)}, and per multiple screenshots inside the group chat, at least two managers haven't spoken since Monday night.`
  );
  pushLine(
    "comedian",
    "excited",
    act1,
    "State of the League",
    `Good morning to winners, and a deeply disrespectful good morning to ${ctx.lowScorer.name}, who walked onto a digital football field in Week ${ctx.week} and dropped a putrid ${ctx.lowScorer.score.toFixed(1)} points against ${ctx.lowScorer.opponent}! Listen to me very carefully: ${ctx.lowScorer.score.toFixed(1)} isn't a fantasy football score, that's a credit score after buying a jet ski on a payday loan! Meanwhile ${ctx.highScorer.name} is out here playing Madden on Rookie difficulty with ${ctx.highScorer.score.toFixed(1)} points. Before TurboTax opens his laptop, let's just acknowledge we witnessed pure Darwinism this weekend.`
  );
  pushLine(
    "guru",
    "analytical",
    act1,
    "Variance Check",
    `First of all, Johnny, stop calling me TurboTax—my model actually converged in four milliseconds this morning. Second, Week ${ctx.week} was a textbook lesson in bimodal scoring distribution. ${ctx.highScorer.name} posted ${ctx.highScorer.score.toFixed(1)} points, clearing the ${ctx.leagueName} median of ${ctx.leagueMedian.toFixed(1)} by ${(ctx.highScorer.score - ctx.leagueMedian).toFixed(1)} full points! Statistically speaking, when one roster outpaces the league baseline by that kind of standard deviation while ${ctx.lowScorer.name} undershoots replacement level by ${(ctx.leagueMedian - ctx.lowScorer.score).toFixed(1)} points, you're not watching parity—you're watching a structural talent vacuum.`
  );
  pushLine(
    "reporter",
    "dramatic",
    act1,
    "Rundown Tease",
    `And we're covering every inch of the wreckage over the next ten minutes. On today's docket: our marquee blowout and cardiac nailbiter, a full whip-around of every single Week ${ctx.week} matchup, the Bench Blunder Hall of Shame, ${ctx.waivers.length > 0 || ctx.trades.length > 0 ? "real FAAB receipts and trade-desk investigations" : "front-office inactivity investigations"}, and our updated Playoff Panic Meter. Buckle up!`
  );

  // =========================================================================
  // ACT II: MARQUEE MASSACRE & CARDIAC THRILLER
  // =========================================================================
  const act2 = "Act II: Marquee Massacre & Cardiac Thriller";
  if (ctx.biggestBlowout) {
    const b = ctx.biggestBlowout;
    const heroCallout = b.winnerTopStarter
      ? ` led by ${b.winnerTopStarter.name} detonating for ${b.winnerTopStarter.points.toFixed(1)} points`
      : "";
    const dudCallout = b.loserDudStarter
      ? ` while ${b.loser} actually started ${b.loserDudStarter.name} for a comical ${b.loserDudStarter.points.toFixed(1)} points`
      : "";

    pushLine(
      "reporter",
      "breaking",
      act2,
      "Biggest Massacre",
      `Let's start at ground zero: ${b.winner} (${b.recordA && b.winner === b.teamA ? b.recordA : b.recordB}) walked into Week ${ctx.week} and obliterated ${b.loser} by a score of ${b.winnerScore.toFixed(1)} to ${b.loserScore.toFixed(1)}—a ${b.margin.toFixed(1)}-point beatdown${heroCallout}${dudCallout}. Sources close to ${b.loser}'s couch confirm the RedZone channel was turned off by 3:20 PM Sunday in favor of staring silently at the ceiling.`
    );
    pushLine(
      "comedian",
      "sarcastic",
      act2,
      "Blowout Roast",
      `A ${b.margin.toFixed(1)}-point margin?! Ref, stop the fight! Throw the damn towel! ${b.winner} didn't just beat ${b.loser}; they claimed ${b.loser} as a dependent on their 2026 tax return! ${b.loserDudStarter ? `And can we talk about trotting out ${b.loserDudStarter.name} for ${b.loserDudStarter.points.toFixed(1)} points? You could have started a retired long-snapper in a walking boot and gotten roughly the same production!` : `When you lose by ${b.margin.toFixed(1)}, you shouldn't even be allowed to put in waiver claims until you write a 500-word apology letter to the commissioner!`}`
    );
    pushLine(
      "guru",
      "analytical",
      act2,
      "Win Leverage",
      `The win-probability curve on ${b.winner} versus ${b.loser} flatlined before the afternoon kickoff window even finished. Even if you gave ${b.loser} league-median luck, a ${b.loserScore.toFixed(1)}-point output loses against ${Math.min(99, Math.max(65, Math.round(((ctx.totalTeams - 2) / Math.max(1, ctx.totalTeams - 1)) * 100)))}% of schedules in ${ctx.leagueName} this week. Meanwhile ${b.winner} proved true ceiling upside—${b.winnerTopStarter ? `${b.winnerTopStarter.name}'s ${b.winnerTopStarter.points.toFixed(1)}-point eruption accounted for ${((b.winnerTopStarter.points / Math.max(1, b.winnerScore)) * 100).toFixed(1)}% of their total scoring,` : "their positional floor held across every slot,"} which is exactly the profile that wins playoff brackets.`
    );
  }

  if (ctx.closestGame && ctx.closestGame !== ctx.biggestBlowout) {
    const c = ctx.closestGame;
    pushLine(
      "reporter",
      "dramatic",
      act2,
      "Cardiac Finish",
      `Now flip the script from a blowout to pure psychological torture: ${c.winner} survived ${c.loser} by a razor-thin ${c.margin.toFixed(2)} points, ${c.winnerScore.toFixed(2)} to ${c.loserScore.toFixed(2)}! Every five-yard checkdown in the fourth quarter swung this matchup back and forth, and ${c.loser} spent Tuesday morning refreshing Sleeper praying for aphantom tackle stat correction that never came.`
    );
    pushLine(
      "guru",
      "analytical",
      act2,
      "Micro-Margin Math",
      `Think about what ${c.margin.toFixed(2)} fantasy points actually represents in ${ctx.scoringLabel} scoring: that is literally one broken tackle, half a sack, or ${ctx.scoringLabel.includes("PPR") ? "a single two-yard screen pass in garbage time" : "eighteen passing yards"}! My blood pressure spiked just auditing the play-by-play log. Over a full ${ctx.season} season, coin-flip wins under ${Math.max(3, Math.ceil(c.margin))} points regress at nearly a 50/50 clip, meaning ${c.winner} burned serious horseshoe equity right here.`
    );
    pushLine(
      "comedian",
      "funny",
      act2,
      "Salt in the Wound",
      `Oh, don't give ${c.loser} the 'unlucky variance' sympathy card, Spencer! Losing by ${c.margin.toFixed(2)} points is the universe's way of punishing you for every smug trash-talk text you sent in September. Do you know how sick to your stomach you feel staring at ${c.loserScore.toFixed(2)} while ${c.winner} is posting victory GIFs with ${c.winnerScore.toFixed(2)}? That kind of heartbreak builds character—or ulcers!`
    );
  } else if (ctx.closestGame) {
    pushLine(
      "comedian",
      "funny",
      act2,
      "No Close Games",
      `And notice how there wasn't even a dramatic nailbiter elsewhere to save us? Even our 'closest' margin was ${ctx.closestGame.winner} over ${ctx.closestGame.loser} by ${ctx.closestGame.margin.toFixed(1)} points! Nobody wanted suspense in Week ${ctx.week}; everybody chose violence!`
    );
  }

  // =========================================================================
  // ACT III: AROUND THE LEAGUE MATCHUP BLITZ
  // =========================================================================
  const act3 = "Act III: Around the League Matchup Blitz";
  const remainingMatchups = ctx.matchups.filter(
    (m) => m !== ctx.biggestBlowout && m !== ctx.closestGame
  );

  if (remainingMatchups.length > 0) {
    pushLine(
      "reporter",
      "breaking",
      act3,
      "Whip-Around Desk",
      `Time for the RedZone Whip-Around—because nobody escapes the studio microphones in ${ctx.leagueName}. We have ${remainingMatchups.length} more official Week ${ctx.week} results on the board, and every single one reshaped the playoff race.`
    );

    for (let i = 0; i < remainingMatchups.length; i += 1) {
      const m = remainingMatchups[i];
      const topNote = m.winnerTopStarter
        ? ` behind ${m.winnerTopStarter.name}'s ${m.winnerTopStarter.points.toFixed(1)}-point clinic`
        : "";
      const benchNote =
        m.benchCostWin && m.loserBestBench
          ? `—and get this, ${m.loser} left ${m.loserBestBench.name}'s ${m.loserBestBench.points.toFixed(1)} points rotting on the bench!`
          : "";

      if (i % 2 === 0) {
        pushLine(
          "guru",
          "analytical",
          act3,
          `${m.teamA} vs ${m.teamB}`,
          `Matchup #${m.matchupId}: ${m.winner} handled ${m.loser}, ${m.winnerScore.toFixed(1)} to ${m.loserScore.toFixed(1)} (a ${m.margin.toFixed(1)}-point spread)${topNote}. Looking at the efficiency split, ${m.winner} ${m.winnerScore >= ctx.leagueMedian ? `cleared the ${ctx.leagueMedian.toFixed(1)} league median comfortably, validating a legitimate contender floor` : `actually won despite finishing below the ${ctx.leagueMedian.toFixed(1)} league median—classic schedule-luck theft`}${benchNote}`
        );
        pushLine(
          "comedian",
          "sarcastic",
          act3,
          `${m.loser} Reaction`,
          `${m.winnerScore < ctx.leagueMedian ? `Hold on—${m.winner} won a fantasy game scoring ${m.winnerScore.toFixed(1)}?! That's like winning a street fight because the other guy tripped over his own shoelaces! ${m.loser} scoring ${m.loserScore.toFixed(1)} in that spot is criminal negligence!` : `Give ${m.winner} their flowers for dropping ${m.winnerScore.toFixed(1)}, because ${m.loser} walked into a woodchipper and came out looking like sawdust at ${m.loserScore.toFixed(1)}!`}`
        );
      } else {
        pushLine(
          "reporter",
          "excited",
          act3,
          `${m.teamA} vs ${m.teamB}`,
          `Over in Matchup #${m.matchupId}, ${m.winner} took down ${m.loser} ${m.winnerScore.toFixed(1)} to ${m.loserScore.toFixed(1)}${topNote}${benchNote}. That moves ${m.winner} to ${m.winner === m.teamA ? m.recordA : m.recordB} while ${m.loser} slides to ${m.loser === m.teamA ? m.recordA : m.recordB} as the schedule tightens.`
        );
        pushLine(
          "comedian",
          "funny",
          act3,
          `${m.winner} Victory Lap`,
          `And you already know ${m.winner} is walking around all week acting like Bill Belichick in 2007! Meanwhile ${m.loser} is at ${m.loser === m.teamA ? m.recordA : m.recordB} staring at their roster like a mechanic who just found three extra bolts after putting the engine back together.`
        );
      }
    }
  } else {
    pushLine(
      "guru",
      "analytical",
      act3,
      "All-Play Breakdown",
      `Stepping back across the full Week ${ctx.week} slate, the gap between our top scorer ${ctx.highScorer.name} (${ctx.highScorer.score.toFixed(1)}) and bottom scorer ${ctx.lowScorer.name} (${ctx.lowScorer.score.toFixed(1)}) spanned ${(ctx.highScorer.score - ctx.lowScorer.score).toFixed(1)} points. In an all-play matrix where every manager plays every other manager simultaneously, ${ctx.highScorer.name} sweeps the board undefeated while ${ctx.lowScorer.name} goes 0-for-the-league.`
    );
  }

  // =========================================================================
  // ACT IV: BENCH CRIMES, FRAUD WATCH & ALL-PLAY ROBBERY
  // =========================================================================
  const act4 = "Act IV: Bench Crimes & Fraud Watch";
  if (ctx.biggestBenchBlunder) {
    const bb = ctx.biggestBenchBlunder;
    pushLine(
      "reporter",
      "breaking",
      act4,
      "Bench Crime Investigation",
      `Sound the sirens—it is time for the Week ${ctx.week} Lineup Malpractice Tribunal! Our forensic audit caught ${bb.manager} red-handed: they started ${bb.dudStarter} for ${bb.dudPoints.toFixed(1)} measly points while ${bb.benchPlayer} sat on the pine erupting for ${bb.benchPoints.toFixed(1)} points! ${bb.costMatchup ? `And yes, folks—that +${(bb.benchPoints - bb.dudPoints).toFixed(1)} point swing was LARGER than their ${bb.margin.toFixed(1)}-point loss! They literally benched their own victory!` : `Even in defeat, leaving +${(bb.benchPoints - bb.dudPoints).toFixed(1)} points on the bench is tough to explain at the Tuesday press conference.`}`
    );
    pushLine(
      "comedian",
      "sarcastic",
      act4,
      "Self-Inflicted Wound",
      `${bb.costMatchup ? `STOP THE SHOW! ${bb.manager} lost by ${bb.margin.toFixed(1)} with ${bb.benchPlayer} dropping ${bb.benchPoints.toFixed(1)} on the bench while ${bb.dudStarter} gave them ${bb.dudPoints.toFixed(1)}?! Delete the app! Hand over your keys! That's not bad luck—that is galaxy-braining yourself at 12:57 PM Sunday because you read one sketchy weather tweet!` : `Watching ${bb.benchPlayer} hang ${bb.benchPoints.toFixed(1)} on your bench while ${bb.dudStarter} sleepwalks to ${bb.dudPoints.toFixed(1)} is why fantasy football ages managers in dog years. ${bb.manager}, my thoughts are NOT with you at this difficult time!`}`
    );
  } else {
    pushLine(
      "comedian",
      "sarcastic",
      act4,
      "Bench Check",
      `Honestly, I went hunting through the bench logs hoping to catch somebody leaving a 40-burger on the pine, and instead half of ${ctx.leagueName}'s benches look like a MASH hospital tent! Nobody has depth—you're all one hamstring tweak away from starting a fullback!`
    );
  }

  if (ctx.luckiestWinner && ctx.unluckiestLoser) {
    pushLine(
      "guru",
      "analytical",
      act4,
      "Fraud vs Robbery Index",
      `Let's run the Fraud & Robbery Index, because the raw win-loss column is lying to you again. Our Luckiest Winner of Week ${ctx.week} is ${ctx.luckiestWinner.name}, who scraped out a W with just ${ctx.luckiestWinner.score.toFixed(1)} points thanks to catching ${ctx.luckiestWinner.opponent} on a down week. Conversely, pour one out for ${ctx.unluckiestLoser.name}, who posted ${ctx.unluckiestLoser.score.toFixed(1)} points—${ctx.unluckiestLoser.score >= ctx.leagueMedian ? `above the ${ctx.leagueMedian.toFixed(1)} league median` : `enough to beat multiple other teams`}—and still ate a loss to ${ctx.unluckiestLoser.opponent}. Statistically speaking, ${ctx.luckiestWinner.name} owes the schedule gods a steak dinner.`
    );
    pushLine(
      "comedian",
      "funny",
      act4,
      "Schedule Merchants",
      `${ctx.luckiestWinner.name} winning with ${ctx.luckiestWinner.score.toFixed(1)} while ${ctx.unluckiestLoser.name} loses with ${ctx.unluckiestLoser.score.toFixed(1)} is the purest fuel for group-chat toxicity ever invented! ${ctx.luckiestWinner.name} is the guy in a group project who writes zero slides, shows up hungover on presentation day, and still gets an A-minus!`
    );
  }

  // =========================================================================
  // ACT V: SCOOP'S TRANSACTION WIRE — WAIVERS, FAAB & TRADE POLICE
  // =========================================================================
  const act5 = "Act V: Transaction Wire & Trade Police";
  if (ctx.waivers.length > 0 || ctx.trades.length > 0) {
    const waiverSummaryLines = ctx.waivers.slice(0, 3).map((w) => {
      const cost =
        w.bid !== null && w.bid > 0
          ? `dropped $${w.bid} FAAB`
          : "snagged off free agency";
      const result = w.startedInWeek
        ? `plugged them straight into the starting lineup for ${(w.pointsScored ?? 0).toFixed(1)} pts`
        : w.pointsScored !== null
          ? `stashed them on the bench (${w.pointsScored.toFixed(1)} pts)`
          : "stashed them on the roster";
      return `${w.manager} ${cost} on ${w.addedPlayer} (Week ${w.week}) and ${result}`;
    });

    pushLine(
      "reporter",
      "breaking",
      act5,
      "Waiver Wire Receipts",
      `Let's open the Transaction Ledger, because the paper trail in ${ctx.leagueName} never lies! ${waiverSummaryLines.length > 0 ? `On the waiver wire: ${waiverSummaryLines.join("; ")}.` : "Waiver claims were eerily quiet this cycle."} ${ctx.mostActiveManager ? `Season-long, ${ctx.mostActiveManager.name} leads the league room with ${ctx.mostActiveManager.moves} total roster transactions, whereas ${ctx.leastActiveManager?.name || "the quietest front office"} has logged just ${ctx.leastActiveManager?.moves ?? 0} moves.` : ""}`
    );

    const topWaiver = ctx.waivers[0];
    if (topWaiver) {
      pushLine(
        "comedian",
        "sarcastic",
        act5,
        "FAAB & Waiver Roast",
        `${topWaiver.bid && topWaiver.bid >= 15 ? `Hold the phone—${topWaiver.manager} unloaded $${topWaiver.bid} of hard-earned FAAB on ${topWaiver.addedPlayer}${topWaiver.startedInWeek && (topWaiver.pointsScored ?? 0) < 8 ? ` just to get ${(topWaiver.pointsScored ?? 0).toFixed(1)} points?! You could have lit $${topWaiver.bid} on fire in the parking lot and at least stayed warm!` : topWaiver.startedInWeek ? ` and actually got ${(topWaiver.pointsScored ?? 0).toFixed(1)} points out of the gate—okay, respect where it's due, even a blind squirrel finds an acorn!` : ` and didn't even have the guts to start them?! Why spend $${topWaiver.bid} on a hood ornament for your bench?!`}` : `Look at ${topWaiver.manager} churning the wire for ${topWaiver.addedPlayer}${ctx.mostActiveManager ? ` while ${ctx.mostActiveManager.name} is up to ${ctx.mostActiveManager.moves} transactions like a day-trader hopped up on six espressos!` : "!"} Half of you treat the waiver wire like a scratch-off lottery ticket at 3 AM Wednesday!`}`
      );
    }

    if (ctx.trades.length > 0) {
      const t = ctx.trades[0];
      pushLine(
        "reporter",
        "dramatic",
        act5,
        "Trade Desk Investigation",
        `And the Trade Police sirens are flashing! Let's pull up the official deal sheet—${t.summary}. ${ctx.trades.length > 1 ? `Plus we also saw ${ctx.trades[1].summary}.` : "The rest of the league immediately ran to the trade calculator to see who got fleeced."}`
      );
      pushLine(
        "guru",
        "analytical",
        act5,
        "Trade Value Verdict",
        `When I run ${t.teamA} and ${t.teamB}'s swap through our rest-of-season VORP matrix, the leverage hinges entirely on starting-lineup consolidation. In a ${ctx.totalTeams}-team ${ctx.scoringLabel} format, the manager acquiring the highest-ceiling weekly starter wins roughly 64% of 2-for-1 or positional reshuffle trades unless injury attrition strikes. ${t.teamA} clearly bet on immediate weekly ceiling while ${t.teamB} gambled on roster balance.`
      );
      pushLine(
        "comedian",
        "funny",
        act5,
        "Fleecing Check",
        `Translation from Nerd to English: somebody in that ${t.teamA}–${t.teamB} deal is going to screenshot that trade in three weeks and frame it in the Louvre, and the other one is going to claim their phone got hacked by Russian bots! At least they have the stones to trade—unlike the rest of this league hoarding bench wide receivers like precious heirlooms!`
      );
    } else {
      pushLine(
        "guru",
        "analytical",
        act5,
        "Trade Market Freeze",
        `What fascinates me is zero completed trades hitting the wire right here despite obvious positional imbalances across ${ctx.leagueName}. Game-theory wise, managers overvalue their own drafted players by an average of 22%—the textbook endowment effect—leaving mutually beneficial starting-lineup upgrades sitting on the table.`
      );
      pushLine(
        "comedian",
        "sarcastic",
        act5,
        "Cowardly GMs",
        `'Endowment effect' is a very polite way of saying you people send horrific trade offers! Everybody in ${ctx.leagueName} offers two bench cloggers and a backup tight end for an RB1 and writes 'bro it helps both of us!' Grow up and send a real offer!`
      );
    }
  } else {
    pushLine(
      "reporter",
      "breaking",
      act5,
      "Front Office Watch",
      `Checking the official ${ctx.leagueName} transaction wire: front offices held their cards tight this week${ctx.mostActiveManager ? `, though season-long ${ctx.mostActiveManager.name} still paces the league with ${ctx.mostActiveManager.moves} moves while ${ctx.leastActiveManager?.name || "the quietest manager"} sits at ${ctx.leastActiveManager?.moves ?? 0}` : ""}. With bye weeks and injuries stacking up, hoarding waiver priority right now is playing with fire.`
    );
    pushLine(
      "comedian",
      "sarcastic",
      act5,
      "Wake Up the GMs",
      `Are half of you in witness protection?! Make a trade! Spend your FAAB! You can't take unused waiver budget with you into the offseason—it doesn't roll over into your 401(k)!`
    );
    pushLine(
      "guru",
      "analytical",
      act5,
      "Replacement Value Math",
      `Johnny's actually right on the math for once. Every week closer to the fantasy playoffs, the expected cumulative VORP of a waiver pickup decays linearly because fewer games remain. Hoarding capital past the midseason inflection point forfeits compounding win-probability gains.`
    );
  }

  // =========================================================================
  // ACT VI: PLAYOFF PANIC METER, SACKO WATCH & RAPID-FIRE SIGN-OFF
  // =========================================================================
  const act6 = "Act VI: Playoff Panic & Sign-Off";
  const topLeader = ctx.standingsTop[0];
  const bubbleNames = ctx.standingsBubble
    .map((b) => `${b.name} (${b.record}, ${b.pf} PF)`)
    .join(", ");

  pushLine(
    "reporter",
    "breaking",
    act6,
    "Standings & Playoff Cutline",
    `Let's lock in the big picture heading out of Week ${ctx.week}. ${topLeader ? `At the summit of ${ctx.leagueName}, ${topLeader.name} holds the #1 throne at ${topLeader.record} with ${topLeader.pf} total points.` : `The top of ${ctx.leagueName} remains a dogfight.`} Meanwhile, with ${ctx.playoffTeams} playoff tickets available, the bubble warzone features ${bubbleNames || "a logjam of .500 squads separated by tiebreakers"}${ctx.sackoFrontrunner ? `, while ${ctx.sackoFrontrunner.name} (${ctx.sackoFrontrunner.record}) anchors the basement on official Sacko Watch` : ""}.`
  );
  pushLine(
    "guru",
    "analytical",
    act6,
    "Monte Carlo Outlook",
    `When we project the remaining regular-season slate across 5,000 simulated outcomes, total Points For becomes destiny on the bubble because head-to-head tiebreakers almost always defer to cumulative scoring. ${topLeader ? `${topLeader.name}'s ${topLeader.pf} PF gives them massive insulation against a one-week dud,` : ""} whereas any bubble team sitting below the league scoring pace cannot afford a passive lineup week. Every single flex decision from here on out carries double-digit playoff-equity swing.`
  );
  pushLine(
    "comedian",
    "excited",
    act6,
    "Sacko Warning",
    `${ctx.sackoFrontrunner ? `And let's keep the spotlight squarely on ${ctx.sackoFrontrunner.name} down at #${ctx.sackoFrontrunner.rank} (${ctx.sackoFrontrunner.record})! Have you started shopping for your last-place punishment outfit yet, ${ctx.sackoFrontrunner.name}? Because at ${ctx.sackoFrontrunner.pf} points, your roster isn't rebuilding—it's an archaeological dig site!` : "And if you're sitting at the bottom of the standings right now, your only job left is playing spoiler and ruining somebody else's December!"}`
  );
  pushLine(
    "reporter",
    "excited",
    act6,
    "Rapid-Fire Hot Seat",
    `Before we sign off—thirty seconds on the clock, rapid-fire locks for next week! Spencer, give the people one analytical mandate; Johnny, give them one survival rule.`
  );
  pushLine(
    "guru",
    "analytical",
    act6,
    "Guru's Mandate",
    `Stop chasing last week's unsustainable touchdown variance and audit target share plus snap routes—and for the love of Gauss, check your Sunday morning inactive designations so you don't donate expected wins to the schedule gods!`
  );
  pushLine(
    "comedian",
    "excited",
    act6,
    "Final Sign-Off",
    `And my survival rule: stop tinkering with your flex at 12:59 PM on the toilet, send a real trade before your season flatlines, and ${ctx.lowScorer.name}—go make your team run stadium stairs! For ${reporterName} and ${guruName}, I'm ${comedianName}. That wraps Week ${ctx.week} on ${ctx.leagueName} Radio—set your waivers and we'll see you degenerates next Tuesday!`
  );

  const metrics = summarizePodcastMetrics(segments);

  const highlights: string[] = [
    `${ctx.highScorer.name}paced ${ctx.leagueName} with ${ctx.highScorer.score.toFixed(1)} pts while ${ctx.lowScorer.name} bottomed out at ${ctx.lowScorer.score.toFixed(1)} pts`,
  ];
  // Fix spacing cleanly
  highlights[0] = `${ctx.highScorer.name} paced ${ctx.leagueName} with ${ctx.highScorer.score.toFixed(1)} pts while ${ctx.lowScorer.name} bottomed out at ${ctx.lowScorer.score.toFixed(1)} pts`;

  if (ctx.closestGame) {
    highlights.push(
      `Cardiac finish: ${ctx.closestGame.winner} edged ${ctx.closestGame.loser} by ${ctx.closestGame.margin.toFixed(2)} pts (${ctx.closestGame.winnerScore.toFixed(1)}–${ctx.closestGame.loserScore.toFixed(1)})`
    );
  }
  if (ctx.biggestBlowout && ctx.biggestBlowout !== ctx.closestGame) {
    highlights.push(
      `Blowout alert: ${ctx.biggestBlowout.winner} demolished ${ctx.biggestBlowout.loser} by ${ctx.biggestBlowout.margin.toFixed(1)} pts`
    );
  }
  if (ctx.biggestBenchBlunder) {
    highlights.push(
      `Bench blunder: ${ctx.biggestBenchBlunder.manager} left ${ctx.biggestBenchBlunder.benchPlayer} (${ctx.biggestBenchBlunder.benchPoints.toFixed(1)} pts) on the pine${ctx.biggestBenchBlunder.costMatchup ? " in a winnable loss" : ""}`
    );
  }
  if (ctx.waivers.length > 0) {
    const w = ctx.waivers[0];
    highlights.push(
      `Transaction spotlight: ${w.manager} added ${w.addedPlayer}${w.bid ? ` ($${w.bid} FAAB)` : ""}`
    );
  } else if (ctx.trades.length > 0) {
    highlights.push(ctx.trades[0].summary);
  }

  return {
    title: `Week ${ctx.week} Radio: ${ctx.highScorer.name}'s Clinic, ${ctx.lowScorer.name}'s Crime Scene & Waiver Receipts`,
    subtitle: `${guruName}, ${comedianName} & ${reporterName} break down all ${ctx.matchups.length} real Week ${ctx.week} matchups, bench blunders & league transactions (~${Math.max(8, Math.round(metrics.estimatedDurationMinutes))} min show).`,
    week: ctx.week,
    leagueName: ctx.leagueName,
    summary: `Full 6-act Week ${ctx.week} broadcast for ${ctx.leagueName} (${metrics.wordCount.toLocaleString()} words · ~${metrics.estimatedDurationMinutes} min). Covers ${ctx.highScorer.name}'s ${ctx.highScorer.score.toFixed(1)}-pt ceiling, ${ctx.lowScorer.name}'s ${ctx.lowScorer.score.toFixed(1)}-pt collapse, every head-to-head matchup, and real waiver/trade activity.`,
    highlights,
    segments,
    script: segments.map((s) => ({
      speaker: s.speaker,
      text: s.text,
      tone: s.tone,
    })),
    acts: metrics.acts,
    wordCount: metrics.wordCount,
    estimatedDurationMinutes: metrics.estimatedDurationMinutes,
    generatedAt: new Date().toISOString(),
    isFallback: Boolean(params.isMock),
    isMock: Boolean(params.isMock),
  };
}

export function buildGeminiPodcastPrompt(params: {
  context: WeeklyPodcastContext;
  personas?: Partial<PodcastPersonas>;
  topic?: string;
}): string {
  const merged: PodcastPersonas = {
    ...DEFAULT_PODCAST_PERSONAS,
    ...(params.personas || {}),
  };
  const guruName = merged.guruName || PODCAST_CAST_PROFILES.guru.characterName;
  const comedianName =
    merged.comedianName || PODCAST_CAST_PROFILES.comedian.characterName;
  const reporterName =
    merged.reporterName || PODCAST_CAST_PROFILES.reporter.characterName;
  const ctx = params.context;

  return `You are the writers' room for an elite, laugh-out-loud funny, unfiltered 8-to-10-minute fantasy football sports radio show (think Pardon My Take + Pat McAfee + Bill Burr on RedZone Sunday) covering Week ${ctx.week} of the "${ctx.leagueName}" (${ctx.season} ${ctx.scoringLabel}, ${ctx.totalTeams} teams).

Episode Focus / Theme: ${params.topic || "Weekly Matchup Recap, Bench Crimes & Transaction Roast"}

### THE THREE STUDIO HOSTS (Maintain sharp, distinct voices & rapid-fire banter!)
1. **"Analytical Guru"** — Character Name: **${guruName}**
   - Persona: ${merged.guru}
   - Foil Dynamic: ${PODCAST_CAST_PROFILES.guru.foilDynamic}
2. **"Comedian"** — Character Name: **${comedianName}**
   - Persona: ${merged.comedian}
   - Foil Dynamic: ${PODCAST_CAST_PROFILES.comedian.foilDynamic}
3. **"Beat Reporter"** — Character Name: **${reporterName}**
   - Persona: ${merged.reporter}
   - Foil Dynamic: ${PODCAST_CAST_PROFILES.reporter.foilDynamic}

### HARD SCRIPT REQUIREMENTS (CRITICAL!)
- **8–10 MINUTE SPOKEN RUNTIME**: Write **28 to 36 substantial dialogue segments** totaling **1,300 to 1,650 words** (each segment should be 2–4 punchy sentences, ~40–60 words, with interruptions, callbacks, nicknames, and comedic timing). Do NOT write a short summary!
- **EXCLUSIVELY THIS LEAGUE ("${ctx.leagueName}")**: Use ONLY the exact team names, manager handles, scores, margins, NFL starter/bench players, FAAB bids, waivers, trades, and standings records from "${ctx.leagueName}" provided in the JSON below. Never reference any other league or invent fake team names!
- **TTS-CLEAN SPOKEN TEXT**: Never put raw emoji characters inside \`text\` because this script goes directly to ElevenLabs voice synthesis! If a team name contains emojis (e.g., \`jordanzfinci ("🙎‍♂️🥚👻3️⃣")\`), refer to them verbally by their handle \`jordanzfinci\` or a funny spoken description like \`"Jordan's Man-Egg-Ghost-Three squad"\`.
- **COVER EVERY MATCHUP & REAL TRANSACTIONS**: Every Week ${ctx.week} matchup in \`matchups\` must be mentioned by name & score, plus call out \`biggestBenchBlunder\`, \`luckiestWinner\`, \`unluckiestLoser\`, and real moves in \`waivers\` and \`trades\`.
- **6-ACT STRUCTURE**: Every segment MUST include an \`act\` field set to one of these exact 6 acts in order:
  1. "Act I: Cold Open & Headline Chaos"
  2. "Act II: Marquee Massacre & Cardiac Thriller"
  3. "Act III: Around the League Matchup Blitz"
  4. "Act IV: Bench Crimes & Fraud Watch"
  5. "Act V: Transaction Wire & Trade Police"
  6. "Act VI: Playoff Panic & Sign-Off"

### VERIFIED WEEK ${ctx.week} LEAGUE FACT PACKET
${JSON.stringify(ctx, null, 2)}
`;
}
