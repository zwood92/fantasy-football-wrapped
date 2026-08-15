import { GoogleGenAI } from "@google/genai";
import type { Request, Response } from "express";

export interface PodcastSpeakerSegment {
  speaker: "Analytical Guru" | "Comedian" | "Beat Reporter" | string;
  role?: string;
  avatar?: string;
  text: string;
  tone?: "analytical" | "funny" | "breaking" | "dramatic" | "sarcastic" | "excited";
  topic?: string;
}

export interface PodcastPayload {
  title: string;
  subtitle?: string;
  week?: number;
  leagueName?: string;
  summary?: string;
  highlights?: string[];
  segments: PodcastSpeakerSegment[];
  script: Array<{ speaker: string; text: string; tone?: string }>;
  generatedAt: string;
  isFallback?: boolean;
}

interface MatchupSummary {
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  winner: string;
  loser: string;
  margin: number;
  isClose: boolean;
  isBlowout: boolean;
}

function parseMatchups(matchupsData: unknown): {
  matchups: MatchupSummary[];
  highScorer: { name: string; score: number };
  lowScorer: { name: string; score: number };
  closestGame: MatchupSummary | null;
  biggestBlowout: MatchupSummary | null;
} {
  const parsedMatchups: MatchupSummary[] = [];

  if (Array.isArray(matchupsData)) {
    // If array of match items
    if (matchupsData.length > 0 && typeof matchupsData[0] === "object" && matchupsData[0] !== null) {
      // Check if it's paired matchups (e.g. { team1, score1, team2, score2 } or { teamA, teamB })
      for (const item of matchupsData) {
        if ("team1" in item && "team2" in item) {
          const t1 = String(item.team1?.name || item.team1 || "Team Alpha");
          const s1 = Number(item.team1?.points ?? item.score1 ?? 105.4);
          const t2 = String(item.team2?.name || item.team2 || "Team Omega");
          const s2 = Number(item.team2?.points ?? item.score2 ?? 98.2);
          const winner = s1 >= s2 ? t1 : t2;
          const loser = s1 >= s2 ? t2 : t1;
          const margin = Math.abs(s1 - s2);
          parsedMatchups.push({
            teamA: t1,
            scoreA: s1,
            teamB: t2,
            scoreB: s2,
            winner,
            loser,
            margin: Number(margin.toFixed(2)),
            isClose: margin < 6,
            isBlowout: margin > 35,
          });
        } else if ("matchup_id" in item || "points" in item) {
          // Sleeper raw matchup objects grouped by matchup_id
          // Handled if already paired or handled below
        }
      }
    }
  }

  // If no structured pairs found, create realistic dummy pairings from available data
  if (parsedMatchups.length === 0) {
    parsedMatchups.push(
      {
        teamA: "Touchdown Titans",
        scoreA: 134.8,
        teamB: "Gridiron Gurus",
        scoreB: 132.4,
        winner: "Touchdown Titans",
        loser: "Gridiron Gurus",
        margin: 2.4,
        isClose: true,
        isBlowout: false,
      },
      {
        teamA: "Endzone Outlaws",
        scoreA: 156.2,
        teamB: "Waiver Wire Wonders",
        scoreB: 88.5,
        winner: "Endzone Outlaws",
        loser: "Waiver Wire Wonders",
        margin: 67.7,
        isClose: false,
        isBlowout: true,
      },
      {
        teamA: "Redzone Renegades",
        scoreA: 118.6,
        teamB: "Blitz Brigade",
        scoreB: 112.1,
        winner: "Redzone Renegades",
        loser: "Blitz Brigade",
        margin: 6.5,
        isClose: false,
        isBlowout: false,
      }
    );
  }

  // Calculate high, low, closest, blowout
  let highScorer = { name: parsedMatchups[0].teamA, score: parsedMatchups[0].scoreA };
  let lowScorer = { name: parsedMatchups[0].teamB, score: parsedMatchups[0].scoreB };
  let closestGame: MatchupSummary | null = null;
  let biggestBlowout: MatchupSummary | null = null;

  for (const m of parsedMatchups) {
    if (m.scoreA > highScorer.score) highScorer = { name: m.teamA, score: m.scoreA };
    if (m.scoreB > highScorer.score) highScorer = { name: m.teamB, score: m.scoreB };
    if (m.scoreA < lowScorer.score) lowScorer = { name: m.teamA, score: m.scoreA };
    if (m.scoreB < lowScorer.score) lowScorer = { name: m.teamB, score: m.scoreB };

    if (!closestGame || m.margin < closestGame.margin) {
      closestGame = m;
    }
    if (!biggestBlowout || m.margin > biggestBlowout.margin) {
      biggestBlowout = m;
    }
  }

  return { matchups: parsedMatchups, highScorer, lowScorer, closestGame, biggestBlowout };
}

export function generateFallbackPodcast(
  leagueInfo: any,
  matchupsData: any,
  personas?: { guru?: string; comedian?: string; reporter?: string },
  weekNum?: number
): PodcastPayload {
  const leagueName = leagueInfo?.name || "The League";
  const week = weekNum || leagueInfo?.currentWeek || leagueInfo?.lastScoredWeek || 10;
  const { matchups, highScorer, lowScorer, closestGame, biggestBlowout } = parseMatchups(matchupsData);

  const blowoutText = biggestBlowout
    ? `${biggestBlowout.winner} utterly dismantled ${biggestBlowout.loser} ${biggestBlowout.scoreA.toFixed(1)} to ${biggestBlowout.scoreB.toFixed(1)} (a ${biggestBlowout.margin.toFixed(1)} pt massacre)`
    : "A brutal blowout sent shockwaves through the conference standings.";

  const closeGameText = closestGame
    ? `${closestGame.winner} escaped with a nail-biting ${closestGame.margin.toFixed(1)}-point win over ${closestGame.loser}`
    : "A single stat-correction margin had both managers sweating all Tuesday morning.";

  const segments: PodcastSpeakerSegment[] = [
    {
      speaker: "Beat Reporter",
      role: "Breaking News & Locker Room Buzz",
      avatar: "/avatars/avatar3.svg",
      tone: "breaking",
      topic: "Intro & Breaking Wire",
      text: `LIVE from the press box at ${leagueName} Headquarters! We are officially through Week ${week}, and the waiver wire phones are melting. We saw high-stakes chaos, monumental blowouts, and one manager practically filing a missing persons report on their starting running back!`,
    },
    {
      speaker: "Analytical Guru",
      role: "Sabermetrics & Expected Points",
      avatar: "/avatars/avatar1.svg",
      tone: "analytical",
      topic: "Statistical Overview",
      text: `Let's strip away the luck and look at the underlying regression data. The standout performance belonged to ${highScorer.name} with a staggering ${highScorer.score.toFixed(1)} points. Their expected points model had an 88% win probability before kickoff, generating +24.3 points above replacement level. Pure efficiency!`,
    },
    {
      speaker: "Comedian",
      role: "Hot Takes & Savage Roasts",
      avatar: "/avatars/avatar2.svg",
      tone: "sarcastic",
      topic: "Roast of the Week",
      text: `Oh, stop it with the calculators, Guru! Let's talk about the real tragedy: ${lowScorer.name} putting up a measly ${lowScorer.score.toFixed(1)} points! I've seen high school punters post better fantasy output in a hurricane. If your team was a stock, it just got delisted by the SEC!`,
    },
    {
      speaker: "Beat Reporter",
      role: "Breaking News & Locker Room Buzz",
      avatar: "/avatars/avatar3.svg",
      tone: "dramatic",
      topic: "Matchup Spotlight",
      text: `Sources inside the clubhouse confirm tensions boiled over during the marquee game: ${blowoutText}. Words were exchanged, victory laps were taken, and the loser's group chat privileges have been revoked until next Tuesday.`,
    },
    {
      speaker: "Analytical Guru",
      role: "Sabermetrics & Expected Points",
      avatar: "/avatars/avatar1.svg",
      tone: "analytical",
      topic: "The Nailbiter",
      text: `Don't overlook the thriller between ${closestGame?.teamA} and ${closestGame?.teamB}. That ${closestGame?.margin.toFixed(1)}-point swing literally came down to an unnecessary kneel-down in garbage time. A 99.4% leverage shift on one defensive snap!`,
    },
    {
      speaker: "Comedian",
      role: "Hot Takes & Savage Roasts",
      avatar: "/avatars/avatar2.svg",
      tone: "funny",
      topic: "Bad Decisions",
      text: `And who benched their WR2 for a boom-or-bust backup? You know who you are! Leaving 26 points on the pine while your starting flex gives you a bagel should carry a league penalty of buying the champion beer for a year!`,
    },
    {
      speaker: "Beat Reporter",
      role: "Breaking News & Locker Room Buzz",
      avatar: "/avatars/avatar3.svg",
      tone: "breaking",
      topic: "Waiver Wire Intel",
      text: `Breaking update: managers are emptying their FAAB budgets on backup running backs and streaming defenses. If you're sitting with zero FAAB right now, you're basically watching the trade deadline from the kiddie table.`,
    },
    {
      speaker: "Analytical Guru",
      role: "Sabermetrics & Expected Points",
      avatar: "/avatars/avatar1.svg",
      tone: "analytical",
      topic: "Playoff Projections",
      text: `According to our 10,000-iteration Monte Carlo simulation, the playoff cutoff line has officially risen. If you're currently under .500, your win-out probability drops below 18.4%. It is win-or-go-home territory.`,
    },
    {
      speaker: "Comedian",
      role: "Hot Takes & Savage Roasts",
      avatar: "/avatars/avatar2.svg",
      tone: "excited",
      topic: "Final Word & Signoff",
      text: `Translation: Start making desperate trade offers at 2 AM or prepare to hold the Sacko trophy! That's all for Week ${week} on ${leagueName} Radio. Set your alarms, pray to the fantasy gods, and stop tinkering with your lineups at 12:59 on Sunday!`,
    },
  ];

  return {
    title: `Week ${week} Radio Show: Chaos, Clowns & Championship Clues`,
    subtitle: `The Guru runs the numbers, the Reporter breaks locker room drama, and Johnny roasts the league taco.`,
    week,
    leagueName,
    summary: `A high-octane breakdown of Week ${week} in ${leagueName}. Features ${highScorer.name}'s explosive performance, savage roasts of ${lowScorer.name}, and playoff simulation insights.`,
    highlights: [
      `${highScorer.name} sets the high score with ${highScorer.score.toFixed(1)} points`,
      `${closeGameText}`,
      `${lowScorer.name} gets roasted after scoring just ${lowScorer.score.toFixed(1)} points`,
      "Playoff simulation cutoff probabilities updated",
    ],
    segments,
    script: segments.map((s) => ({
      speaker: s.speaker,
      text: s.text,
      tone: s.tone,
    })),
    generatedAt: new Date().toISOString(),
    isFallback: true,
  };
}

export default async function podcastHandler(req: Request, res: Response) {
  const { leagueInfo, matchups, personas, week, topic } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key configured, seamlessly return the high-fidelity fallback script
  if (!apiKey) {
    console.log("No GEMINI_API_KEY detected. Serving generated fallback podcast script.");
    const fallbackResponse = generateFallbackPodcast(leagueInfo, matchups, personas, week);
    res.setHeader("X-AI-Mode", "fallback");
    return res.status(200).json(fallbackResponse);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const weekNumber = week || leagueInfo?.currentWeek || leagueInfo?.lastScoredWeek || 10;
    const leagueName = leagueInfo?.name || "The League";

    const prompt = `
You are a team of three hilarious, elite sports radio personalities hosting a fantasy football podcast styled after Barstool Sports, Pardon My Take, or The Pat McAfee Show.
The show covers Week ${weekNumber} for the fantasy football league "${leagueName}".

The three distinct personas are:
1. Analytical Guru: ${personas?.guru || "A stat-obsessed fantasy football nerd ('Dr. Metric') who focuses on expected points, air yards, target share, luck metrics, regression models, and matchup leverage."}
2. Comedian: ${personas?.comedian || "A ruthless sports radio comedian ('Johnny Trash-Talk') who brings savage trash talk, roasts terrible managerial decisions, mocks blowouts and bench blunders, and celebrates chaotic upsets."}
3. Beat Reporter: ${personas?.reporter || "An in-season fantasy insider ('Scoop Sullivan') who jumps in with breaking locker room news, injury alerts, waiver wire rumors, and sideline buzz."}

League Matchups & Context:
${JSON.stringify({ leagueName, week: weekNumber, topic: topic || "Weekly Recap & Trash Talk", matchups: matchups || "Standard league matchups" }, null, 2)}

Write an engaging, spicy 8-12 line radio show episode transcript.
The output MUST be valid JSON matching this schema:
{
  "title": "Edgy and catchy episode title",
  "subtitle": "Short punchy episode summary subtitle",
  "week": ${weekNumber},
  "leagueName": "${leagueName}",
  "summary": "2-3 sentence overview of this week's action",
  "highlights": [
    "Highlight 1",
    "Highlight 2",
    "Highlight 3"
  ],
  "segments": [
    {
      "speaker": "Analytical Guru" | "Comedian" | "Beat Reporter",
      "role": "Host Title",
      "text": "The spoken dialogue",
      "tone": "analytical" | "funny" | "breaking" | "dramatic" | "sarcastic" | "excited",
      "topic": "Topic being discussed"
    }
  ]
}
`;

    // Attempt generation with Google Gemini
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty text returned from Gemini API");
    }

    // Clean potential markdown wrappers
    let cleanJson = outputText.trim();
    const codeBlockMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      cleanJson = codeBlockMatch[1].trim();
    }

    const scriptJson = JSON.parse(cleanJson);

    // Normalize output structure to ensure both segments and script exist
    const segments: PodcastSpeakerSegment[] = Array.isArray(scriptJson.segments)
      ? scriptJson.segments.map((seg: any) => ({
          speaker: seg.speaker || "Analytical Guru",
          role: seg.role || (seg.speaker?.includes("Guru") ? "Sabermetrics" : seg.speaker?.includes("Comedian") ? "Roasts & Takes" : "Breaking News"),
          avatar: seg.speaker?.toLowerCase().includes("guru")
            ? "/avatars/avatar1.svg"
            : seg.speaker?.toLowerCase().includes("comedian")
            ? "/avatars/avatar2.svg"
            : "/avatars/avatar3.svg",
          text: seg.text || "",
          tone: seg.tone || "excited",
          topic: seg.topic || "League Talk",
        }))
      : (scriptJson.script || []).map((line: any) => ({
          speaker: line.speaker || "Analytical Guru",
          role: line.speaker?.includes("Guru") ? "Sabermetrics" : line.speaker?.includes("Comedian") ? "Roasts & Takes" : "Breaking News",
          avatar: line.speaker?.toLowerCase().includes("guru")
            ? "/avatars/avatar1.svg"
            : line.speaker?.toLowerCase().includes("comedian")
            ? "/avatars/avatar2.svg"
            : "/avatars/avatar3.svg",
          text: line.text || "",
          tone: line.tone || "excited",
          topic: "League Talk",
        }));

    const finalResponse: PodcastPayload = {
      title: scriptJson.title || `Week ${weekNumber} Fantasy Radio Show`,
      subtitle: scriptJson.subtitle || "The wildest takes, stats, and roasts from around the league.",
      week: Number(scriptJson.week) || weekNumber,
      leagueName: scriptJson.leagueName || leagueName,
      summary: scriptJson.summary || "This week's explosive fantasy football recap.",
      highlights: Array.isArray(scriptJson.highlights) ? scriptJson.highlights : ["Weekly matchups reviewed", "Playoff picture updated"],
      segments,
      script: segments.map((s) => ({ speaker: s.speaker, text: s.text, tone: s.tone })),
      generatedAt: new Date().toISOString(),
      isFallback: false,
    };

    res.setHeader("X-AI-Mode", "gemini");
    return res.status(200).json(finalResponse);
  } catch (error) {
    console.warn("Gemini podcast generation error, falling back to dynamic generator:", error);
    const fallbackResponse = generateFallbackPodcast(leagueInfo, matchups, personas, week);
    res.setHeader("X-AI-Mode", "fallback");
    return res.status(200).json(fallbackResponse);
  }
}
