export interface PodcastSpeakerSegment {
  speaker: "Analytical Guru" | "Comedian" | "Beat Reporter" | string;
  role?: string;
  avatar?: string;
  text: string;
  tone?: "analytical" | "funny" | "breaking" | "dramatic" | "sarcastic" | "excited";
  topic?: string;
}

export interface PodcastEpisode {
  title: string;
  subtitle?: string;
  week: number;
  leagueName: string;
  summary: string;
  highlights: string[];
  segments: PodcastSpeakerSegment[];
  script: Array<{ speaker: string; text: string; tone?: string }>;
  generatedAt: string;
  isMock?: boolean;
}

export interface PodcastPersonas {
  guru: string;
  comedian: string;
  reporter: string;
}

export interface TradeSide {
  teamName: string;
  giving: string[];
  receiving: string[];
}

export interface TradeAnalysisRequest {
  leagueName?: string;
  format?: "PPR" | "Half-PPR" | "Standard" | "Dynasty" | "Superflex";
  teamA: TradeSide;
  teamB: TradeSide;
  currentWeek?: number;
}

export interface TradeHostVerdict {
  host: string;
  role: string;
  avatar: string;
  quote: string;
  rating: string;
}

export interface TradeAnalysisResponse {
  verdict: "Fair & Balanced" | "Clear Winner" | "Massive Heist" | "High Risk / High Reward" | "Blockbuster Rebuild";
  winnerTeam: string | null;
  gradeTeamA: string;
  gradeTeamB: string;
  scoreA: number; // 0 - 100
  scoreB: number; // 0 - 100
  summary: string;
  keyFactors: string[];
  hostVerdicts: TradeHostVerdict[];
  recommendation: string;
}

export interface TeamDiagnosticRequest {
  teamName: string;
  managerName?: string;
  record: string; // e.g. "7-3"
  rank: number;
  totalTeams?: number;
  pointsFor: number;
  pointsAgainst: number;
  roster?: Array<{
    name: string;
    position: string;
    avgPoints?: number;
    injuryStatus?: string;
  }>;
}

export interface TeamDiagnosticResponse {
  teamName: string;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
  archetype: string;
  healthStatus: "True Contender" | "Dangerous Fraud" | "Unlucky Powerhouse" | "Waiver Alchemist" | "Rebuilding / Sacko Watch";
  luckRating: number; // -10 (unlucky) to +10 (very lucky)
  summary: string;
  strengths: string[];
  weaknesses: string[];
  prescriptions: string[];
  guruTake: string;
  comedianTake: string;
  reporterTake: string;
}

export interface WeeklyRecapRequest {
  week: number;
  leagueName: string;
  matchups: Array<{
    team1: string;
    score1: number;
    team2: string;
    score2: number;
    margin?: number;
  }>;
  highScorer?: { name: string; score: number };
  lowScorer?: { name: string; score: number };
}

export interface WeeklyAward {
  title: string;
  recipient: string;
  category: "hero" | "goat" | "clown" | "heartbreak";
  description: string;
}

export interface WeeklyRecapResponse {
  week: number;
  leagueName: string;
  headline: string;
  subtitle: string;
  summary: string;
  topStorylines: string[];
  awards: WeeklyAward[];
  hostDiscussion: PodcastSpeakerSegment[];
  powerMoves: string[];
  badBeats: string[];
}

export interface NewsletterSection {
  heading: string;
  subheading?: string;
  body: string;
  callout?: string;
}

export interface NewsletterArticle {
  id: string;
  title: string;
  subtitle: string;
  volume: string;
  issue: number;
  date: string;
  leagueName: string;
  commissionerNote: string;
  sections: NewsletterSection[];
  topRankings: Array<{ rank: number; team: string; record: string; blurb: string }>;
  hotWaiverPicks: string[];
}

// Default Personas
export const DEFAULT_PODCAST_PERSONAS: PodcastPersonas = {
  guru: "A stat-obsessed football nerd who analyzes expected points, air yards, target shares, and game theory.",
  comedian: "A ruthless sports radio comedian who brings brutal trash talk, roasts bad decisions, and mocks blowout losers.",
  reporter: "An in-season insider breaking locker room drama, injury updates, and waiver wire whispers.",
};

/**
 * Call the backend /api/podcast endpoint with fallback
 */
export async function generatePodcastEpisode(params: {
  leagueInfo?: any;
  matchups?: any;
  personas?: Partial<PodcastPersonas>;
  week?: number;
  topic?: string;
}): Promise<PodcastEpisode> {
  const mergedPersonas: PodcastPersonas = {
    ...DEFAULT_PODCAST_PERSONAS,
    ...(params.personas || {}),
  };

  try {
    const response = await fetch("/api/podcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leagueInfo: params.leagueInfo,
        matchups: params.matchups,
        personas: mergedPersonas,
        week: params.week,
        topic: params.topic,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.segments)) {
        return data as PodcastEpisode;
      }
    }
  } catch (err) {
    console.warn("API podcast call failed or offline, generating client-side fallback:", err);
  }

  // Client-side fallback generator
  return createClientFallbackPodcast(params.leagueInfo, params.matchups, mergedPersonas, params.week);
}

/**
 * Client-side fallback podcast generator
 */
export function createClientFallbackPodcast(
  leagueInfo?: any,
  matchupsData?: any,
  personas?: Partial<PodcastPersonas>,
  weekNum?: number
): PodcastEpisode {
  const leagueName = leagueInfo?.name || "The League";
  const week = weekNum || leagueInfo?.currentWeek || leagueInfo?.lastScoredWeek || 10;

  let teamHigh = "Touchdown Titans";
  let scoreHigh = 148.6;
  let teamLow = "Waiver Wire Wonders";
  let scoreLow = 79.4;
  let closeTeamA = "Gridiron Gladiators";
  let closeTeamB = "Redzone Renegades";
  let closeMargin = 1.8;

  if (Array.isArray(matchupsData) && matchupsData.length > 0) {
    const validScores: Array<{ name: string; score: number }> = [];
    for (const m of matchupsData) {
      if (m.team1 && m.score1 !== undefined) {
        validScores.push({ name: String(m.team1.name || m.team1), score: Number(m.score1) });
      }
      if (m.team2 && m.score2 !== undefined) {
        validScores.push({ name: String(m.team2.name || m.team2), score: Number(m.score2) });
      }
    }
    if (validScores.length >= 2) {
      validScores.sort((a, b) => b.score - a.score);
      teamHigh = validScores[0].name;
      scoreHigh = validScores[0].score;
      teamLow = validScores[validScores.length - 1].name;
      scoreLow = validScores[validScores.length - 1].score;
    }
  }

  const segments: PodcastSpeakerSegment[] = [
    {
      speaker: "Beat Reporter",
      role: "Breaking News",
      avatar: "/avatars/avatar3.svg",
      tone: "breaking",
      topic: "Show Kickoff",
      text: `We are LIVE on the airwaves for Week ${week} of ${leagueName}! The trade deadline is looming, tempers in the league chat are at an all-time high, and we have breaking injury updates impacting playoff seeding.`,
    },
    {
      speaker: "Analytical Guru",
      role: "Expected Points & Sabermetrics",
      avatar: "/avatars/avatar1.svg",
      tone: "analytical",
      topic: "Star of the Week",
      text: `Let's break down ${teamHigh}'s dominant week with ${scoreHigh.toFixed(1)} points. Their expected points model had them at a 94.2% win probability by halftime of the afternoon slate. When your starting flex puts up 24+ points, mathematical variance tilts heavily in your favor.`,
    },
    {
      speaker: "Comedian",
      role: "Savage Roasts & Hot Takes",
      avatar: "/avatars/avatar2.svg",
      tone: "sarcastic",
      topic: "The Sacko Watch",
      text: `Okay, Dr. Calculator, let's talk about the real comedy show: ${teamLow} putting up ${scoreLow.toFixed(1)} total points. I haven't seen an offensive display that embarrassing since my high school JV team played in a blizzard! Someone check their manager's pulse!`,
    },
    {
      speaker: "Beat Reporter",
      role: "Breaking News",
      avatar: "/avatars/avatar3.svg",
      tone: "dramatic",
      topic: "Nailbiter Drama",
      text: `Sources confirm ${closeTeamA} and ${closeTeamB} came down to the final 2 minutes on Monday night. That ${closeMargin.toFixed(1)}-point difference had the entire league chat glued to stat-correction updates until 3 AM!`,
    },
    {
      speaker: "Analytical Guru",
      role: "Expected Points & Sabermetrics",
      avatar: "/avatars/avatar1.svg",
      tone: "analytical",
      topic: "Playoff Odds",
      text: `Looking at our 10,000-iteration Monte Carlo projections, the margin for error is razor-thin. Teams with 6 wins have an 81% playoff lock, while 5-win teams are in a statistical coin-flip.`,
    },
    {
      speaker: "Comedian",
      role: "Savage Roasts & Hot Takes",
      avatar: "/avatars/avatar2.svg",
      tone: "excited",
      topic: "Closing Roast",
      text: `Bottom line: Set your alarms, pray to the fantasy gods, and stop benching your studs because you read a hunch on Reddit! We'll see you next week on ${leagueName} Radio!`,
    },
  ];

  return {
    title: `Week ${week} Radio Show: Chaos, Clowns & Championship Clues`,
    subtitle: `The Guru calculates win leverage while Johnny roasts the basement dwellers.`,
    week,
    leagueName,
    summary: `Week ${week} brought wild swings in ${leagueName}. ${teamHigh} posted a week-high ${scoreHigh.toFixed(1)}, while ${teamLow} stumbled into the Sacko danger zone.`,
    highlights: [
      `${teamHigh} tops the leaderboard with ${scoreHigh.toFixed(1)} pts`,
      `Monday Night thriller decided by ${closeMargin.toFixed(1)} pts`,
      `${teamLow} gets put on blast after scoring only ${scoreLow.toFixed(1)} pts`,
      "Playoff bubble leverage indices analyzed",
    ],
    segments,
    script: segments.map((s) => ({ speaker: s.speaker, text: s.text, tone: s.tone })),
    generatedAt: new Date().toISOString(),
    isMock: true,
  };
}

/**
 * AI Trade Analysis Engine
 */
export async function generateTradeAnalysis(request: TradeAnalysisRequest): Promise<TradeAnalysisResponse> {
  const teamAName = request.teamA.teamName || "Team 1";
  const teamBName = request.teamB.teamName || "Team 2";
  const givesA = request.teamA.giving.length > 0 ? request.teamA.giving : ["Star RB1", "WR2"];
  const receivesA = request.teamA.receiving.length > 0 ? request.teamA.receiving : ["Elite WR1", "Future 1st"];
  const givesB = request.teamB.giving.length > 0 ? request.teamB.giving : receivesA;
  const receivesB = request.teamB.receiving.length > 0 ? request.teamB.receiving : givesA;

  // Compute mock trade valuation
  const scoreA = Math.floor(65 + Math.random() * 28);
  const scoreB = Math.floor(65 + Math.random() * 28);
  const diff = scoreA - scoreB;

  let verdict: TradeAnalysisResponse["verdict"] = "Fair & Balanced";
  let winnerTeam: string | null = null;
  let gradeA = "B+";
  let gradeB = "B+";

  if (diff > 12) {
    verdict = "Clear Winner";
    winnerTeam = teamAName;
    gradeA = "A";
    gradeB = "C+";
  } else if (diff < -12) {
    verdict = "Clear Winner";
    winnerTeam = teamBName;
    gradeA = "C+";
    gradeB = "A";
  } else if (Math.abs(diff) <= 6) {
    verdict = "Fair & Balanced";
    winnerTeam = null;
    gradeA = "A-";
    gradeB = "A-";
  } else {
    verdict = "High Risk / High Reward";
    winnerTeam = diff > 0 ? teamAName : teamBName;
    gradeA = "B+";
    gradeB = "B";
  }

  const hostVerdicts: TradeHostVerdict[] = [
    {
      host: "Analytical Guru",
      role: "Expected Points & Value Curves",
      avatar: "/avatars/avatar1.svg",
      rating: `${scoreA} vs ${scoreB} pts`,
      quote: `From a value-over-replacement standpoint, acquiring ${receivesA.join(", ")} adds +3.8 projected weekly ceiling points to ${teamAName}'s starting lineup while maintaining roster depth.`,
    },
    {
      host: "The Comedian",
      role: "Vibe Check & Trade Police",
      avatar: "/avatars/avatar2.svg",
      rating: verdict === "Clear Winner" ? "ROBBERY ALERT" : "VIBES APPROVED",
      quote: diff > 8
        ? `Did ${teamAName} buy dinner first before pulling off this absolute fleecing? If I'm ${teamBName}, I'm calling the police!`
        : `Finally, a trade in this league that doesn't make me want to throw my laptop out the window. Both teams got what they needed.`,
    },
    {
      host: "Beat Reporter",
      role: "Locker Room Reaction",
      avatar: "/avatars/avatar3.svg",
      rating: "CONFIRMED",
      quote: `League sources tell me both managers spent 3 hours haggling over draft pick protections before pulling the trigger. The group chat is already in an uproar.`,
    },
  ];

  return {
    verdict,
    winnerTeam,
    gradeTeamA: gradeA,
    gradeTeamB: gradeB,
    scoreA,
    scoreB,
    summary: `${teamAName} receives ${receivesA.join(", ")} in exchange for sending ${givesA.join(", ")} to ${teamBName}. The deal primarily addresses roster balance and upcoming bye week schedules.`,
    keyFactors: [
      `Positional scarcity impact favors ${winnerTeam || "both sides equally"}`,
      `Playoff schedule strength for incoming assets is favorable in Weeks 15-17`,
      `Minimal risk of replacement level drop-off at flex positions`,
    ],
    hostVerdicts,
    recommendation: verdict === "Massive Heist"
      ? "Accept immediately before the other manager wakes up."
      : "Solid deal that benefits both managers' championship windows.",
  };
}

/**
 * AI Team Diagnostic Engine
 */
export async function generateTeamDiagnostic(request: TeamDiagnosticRequest): Promise<TeamDiagnosticResponse> {
  const { teamName, record, pointsFor, pointsAgainst, rank } = request;
  const pf = pointsFor || 1150.0;
  const pa = pointsAgainst || 1120.0;
  const [wins, losses] = record.split("-").map(Number);
  const winRate = wins / (wins + losses || 1);

  let grade: TeamDiagnosticResponse["grade"] = "B";
  let archetype = "The Steady Contender";
  let healthStatus: TeamDiagnosticResponse["healthStatus"] = "True Contender";
  let luckRating = 0;

  if (winRate >= 0.7 && pf >= 1200) {
    grade = "A+";
    archetype = "The Unstoppable Juggernaut";
    healthStatus = "True Contender";
    luckRating = 2.4;
  } else if (winRate >= 0.6 && pf < 1050) {
    grade = "B-";
    archetype = "The Lucky Fraud";
    healthStatus = "Dangerous Fraud";
    luckRating = 8.1;
  } else if (winRate < 0.45 && pf >= 1180) {
    grade = "B+";
    archetype = "The Unlucky Powerhouse";
    healthStatus = "Unlucky Powerhouse";
    luckRating = -7.6;
  } else if (winRate <= 0.3) {
    grade = "F";
    archetype = "The Sacko Frontrunner";
    healthStatus = "Rebuilding / Sacko Watch";
    luckRating = -2.1;
  } else {
    grade = "B";
    archetype = "The Playoff Bubble Scrapper";
    healthStatus = "Waiver Alchemist";
    luckRating = 0.5;
  }

  const strengths = [
    `Consistent weekly scoring baseline (${(pf / (wins + losses || 1)).toFixed(1)} PPG average)`,
    "High floor from cornerstone starters at RB and WR",
    "Favorable remaining divisional matchup schedule",
  ];

  const weaknesses = [
    "Vulnerable to late-season bye week crunches",
    "Bench depth drops off sharply after WR3",
    "High points against suggests opponent scheduling bad luck",
  ];

  const prescriptions = [
    "Target high-upside backup running backs with standalone handcuff value",
    "Stream defenses targeting bottom-5 passing offenses over the next 3 weeks",
    "Consolidate 2-for-1 bench depth for an elite starting upgrade before the trade deadline",
  ];

  return {
    teamName,
    grade,
    archetype,
    healthStatus,
    luckRating,
    summary: `${teamName} is currently ranked #${rank || 1} with a ${record} record. With ${pf.toFixed(1)} Points For and ${pa.toFixed(1)} Points Against, this roster is classified as "${archetype}".`,
    strengths,
    weaknesses,
    prescriptions,
    guruTake: `Underlying efficiency metrics show a true win expectation of ${(winRate * 100).toFixed(1)}%. Their luck index of ${luckRating > 0 ? "+" : ""}${luckRating.toFixed(1)} indicates ${luckRating > 3 ? "impending regression to the mean" : "stable playoff capability"}.`,
    comedianTake: luckRating > 5
      ? `This team is running on pure fairy dust and luck. Opponents forget how to play football every time they match up!`
      : `Solid squad. If you don't overthink your lineup at 12:55 PM on Sunday, you might actually win this thing.`,
    reporterTake: `Clubhouse sources indicate manager morale is high, but the waiver wire priority list is already stacked with contingency claims.`,
  };
}

/**
 * AI Weekly Recap Engine
 */
export async function generateWeeklyRecapSummary(request: WeeklyRecapRequest): Promise<WeeklyRecapResponse> {
  const { week, leagueName, matchups } = request;
  const highScorer = request.highScorer || { name: "Redzone Renegades", score: 154.2 };
  const lowScorer = request.lowScorer || { name: "Bench Warmers", score: 81.4 };

  const awards: WeeklyAward[] = [
    {
      title: "Championship Statement of the Week",
      recipient: highScorer.name,
      category: "hero",
      description: `Dropped a league-leading ${highScorer.score.toFixed(1)} points with total lineup domination.`,
    },
    {
      title: "The Golden Bench Trophy",
      recipient: lowScorer.name,
      category: "clown",
      description: `Managed just ${lowScorer.score.toFixed(1)} points while leaving multiple touchdowns on the pine.`,
    },
    {
      title: "Heartbreak Beat of the Week",
      recipient: matchups[0]?.team2 || "Gridiron Gurus",
      category: "heartbreak",
      description: `Lost by less than 2.5 points after a final drive stat correction.`,
    },
  ];

  const hostDiscussion: PodcastSpeakerSegment[] = [
    {
      speaker: "Analytical Guru",
      role: "Sabermetrics",
      avatar: "/avatars/avatar1.svg",
      tone: "analytical",
      text: `Week ${week} featured an average league score of 118.4. The standard deviation across all matchups was the tightest we've seen all season.`,
    },
    {
      speaker: "The Comedian",
      role: "Hot Takes",
      avatar: "/avatars/avatar2.svg",
      tone: "sarcastic",
      text: `Shoutout to ${highScorer.name} for putting the fear of god into the entire conference, and thoughts & prayers to ${lowScorer.name}'s ego.`,
    },
    {
      speaker: "Beat Reporter",
      role: "Breaking News",
      avatar: "/avatars/avatar3.svg",
      tone: "breaking",
      text: `Waiver claims are already flying in. Over 40% of remaining FAAB dollars were spent overnight.`,
    },
  ];

  return {
    week,
    leagueName,
    headline: `Week ${week} Chaos: Record Blowouts & Last-Second Heartbreaks`,
    subtitle: `The playoff picture tightens as ${highScorer.name} lays down the law.`,
    summary: `Week ${week} in ${leagueName} delivered pure theater. With crucial divisional seeding on the line, favorites stumbled while unexpected heroes emerged from the flex spot.`,
    topStorylines: [
      `${highScorer.name} puts up ${highScorer.score.toFixed(1)} points in offensive fireworks show`,
      `${lowScorer.name} suffers catastrophic low-score collapse`,
      "Playoff seeding tiebreaker scenarios triggered across 3 divisions",
    ],
    awards,
    hostDiscussion,
    powerMoves: [
      `${highScorer.name} vaults into sole possession of the #1 seed`,
      "Aggressive waiver wire streaming pays off with a 22-point kicker explosion",
    ],
    badBeats: [
      `Starting a defense that posted -4.0 points in the fourth quarter`,
      `Leaving a 3-touchdown WR on the bench in a 1.2-point loss`,
    ],
  };
}

/**
 * AI Newsletter Generator
 */
export async function generateNewsletterContent(params: {
  leagueInfo?: any;
  week?: number;
  theme?: "roast" | "gazette" | "playoffs" | "dynasty";
}): Promise<NewsletterArticle> {
  const leagueName = params.leagueInfo?.name || "The League";
  const week = params.week || params.leagueInfo?.currentWeek || params.leagueInfo?.lastScoredWeek || 10;
  const theme = params.theme || "gazette";

  const headlines: Record<string, { title: string; subtitle: string }> = {
    roast: {
      title: `The Weekly Roast: Week ${week} Clowns & Catastrophes`,
      subtitle: `No manager is safe as we expose the worst start/sit blunders in ${leagueName}.`,
    },
    playoffs: {
      title: `The Playoff Hunt: Week ${week} Clinch & Elimination Scenarios`,
      subtitle: `Crunching the numbers, tiebreakers, and magic numbers across every division.`,
    },
    dynasty: {
      title: `Dynasty Deep Dive: Week ${week} Rookie Stock Watch & Assets`,
      subtitle: `Long term valuation swings, future draft capital leverage, and rebuild grades.`,
    },
    gazette: {
      title: `The Gridiron Gazette: Official Week ${week} Dispatch`,
      subtitle: `Matchup recaps, power rankings shakeups, and the stories defining our season.`,
    },
  };

  const selectedHead = headlines[theme] || headlines.gazette;

  return {
    id: `newsletter-w${week}-${Date.now()}`,
    title: selectedHead.title,
    subtitle: selectedHead.subtitle,
    volume: `Vol. ${new Date().getFullYear()}`,
    issue: week,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    leagueName,
    commissionerNote: `Welcome to the official Week ${week} edition of the ${leagueName} Gazette. With only a few weeks remaining before the playoffs, every single roster move carries championship weight. Please remember trade deadline rules and ensure your lineups are locked prior to kickoff!`,
    sections: [
      {
        heading: "1. Matchup of the Week & Star of the Slate",
        subheading: "High-flying fireworks and clutch Monday night performances",
        body: `The marquee matchup of Week ${week} delivered everything fantasy fans could hope for. Both managers traded punches through Sunday afternoon, culminating in a dramatic fourth-quarter drive that decided the game by fewer than three fantasy points.\n\nKey takeaway: Lineup depth continues to separate true title contenders from pretenders. When your flex spot regularly generates 15+ PPR points, you are mathematically favored against 90% of opponents.`,
        callout: "Stat of the Week: The winning squad outperformed their projected ceiling by 28.4%!",
      },
      {
        heading: "2. The Bad Beat & Bench Regret Corner",
        subheading: "Leaving championship points on the pine",
        body: `We have all been there: staring at your bench on Sunday night, watching a backup wide receiver catch two touchdowns while your WR2 puts up a quiet 3 catches for 24 yards.\n\nIn Week ${week}, over 82 combined bench points were left unused across the league. Fantasy football can be cruel, but tinkering with proven starters remains the #1 cause of unforced losses.`,
        callout: "Quote of the Week: 'I would have won if I literally hadn't touched my lineup since Thursday.'",
      },
      {
        heading: "3. Waiver Wire Radar & Trade Speculation",
        subheading: "Where the championship will be won in the coming weeks",
        body: `With multiple injuries hitting bellcow running backs, the waiver wire represents the battleground for league supremacy. Managers with remaining FAAB budget are positioned to pounce on high-upside backup running backs with clear paths to 18+ touches per game.`,
      },
    ],
    topRankings: [
      { rank: 1, team: "Touchdown Titans", record: "8-2", blurb: "Dominant roster with league-leading points for and zero glaring roster holes." },
      { rank: 2, team: "Redzone Renegades", record: "7-3", blurb: "Riding a 4-game win streak with elite WR1 production carrying the load." },
      { rank: 3, team: "Gridiron Gladiators", record: "6-4", blurb: "Dangerous playoff contender with top-3 weekly ceiling when fully healthy." },
      { rank: 4, team: "Endzone Outlaws", record: "5-5", blurb: "In the thick of the wildcard hunt; needs waiver depth to survive bye weeks." },
    ],
    hotWaiverPicks: [
      "Top Handcuff RB (Target 25-35% FAAB)",
      "High Target-Share Slot WR (Target 15-20% FAAB)",
      "Streaming Defense with favorable Week 12-14 schedule (Target 5-10% FAAB)",
    ],
  };
}
