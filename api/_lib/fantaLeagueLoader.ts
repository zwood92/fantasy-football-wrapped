import {
  EXCLUSIVE_PODCAST_LEAGUE_ID,
  type PlayerLookupRecord,
} from "../../src/lib/podcastEngine.js";

let cachedPlayerMap: PlayerLookupRecord | null = null;
let cachedPlayerMapAt = 0;

let cachedFantaBundle: {
  fetchedAt: number;
  leagueInfo: any;
  lastScoredWeek: number;
} | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return (await res.json()) as T;
}

function formatFantaTeamDisplayName(rawTeamName?: string, username?: string): string {
  const cleanTeam = (rawTeamName || "").trim();
  const cleanUser = (username || "Manager").trim();
  if (!cleanTeam) return cleanUser;
  // If team name has no ASCII letters (e.g. emoji-only '🙎‍♂️🥚👻3️⃣'), include @username so hosts can pronounce it!
  if (!/[a-zA-Z]/.test(cleanTeam)) {
    return `${cleanUser} ("${cleanTeam}")`;
  }
  if (cleanTeam.toLowerCase() === cleanUser.toLowerCase()) {
    return cleanTeam;
  }
  return `${cleanTeam} (@${cleanUser})`;
}

export async function getSleeperNflPlayerMap(): Promise<PlayerLookupRecord> {
  const now = Date.now();
  if (cachedPlayerMap && now - cachedPlayerMapAt < 1000 * 60 * 60 * 6) {
    return cachedPlayerMap;
  }
  const allPlayers = await fetchJson<Record<string, any>>(
    "https://api.sleeper.app/v1/players/nfl"
  );
  const map: PlayerLookupRecord = {};
  for (const [pid, p] of Object.entries(allPlayers)) {
    const fullName =
      p.full_name ||
      `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
      p.team;
    if (fullName) {
      map[pid] = {
        name: fullName,
        position: p.position || "",
        team: p.team || "",
      };
    }
  }
  cachedPlayerMap = map;
  cachedPlayerMapAt = now;
  return map;
}

export async function loadExclusiveFantaLeagueData(): Promise<{
  leagueInfo: any;
  playerMap: PlayerLookupRecord;
  lastScoredWeek: number;
}> {
  const leagueId = EXCLUSIVE_PODCAST_LEAGUE_ID;
  const now = Date.now();

  const playerMapPromise = getSleeperNflPlayerMap().catch(() => ({}));

  if (cachedFantaBundle && now - cachedFantaBundle.fetchedAt < 1000 * 60 * 5) {
    const playerMap = await playerMapPromise;
    return {
      leagueInfo: cachedFantaBundle.leagueInfo,
      playerMap,
      lastScoredWeek: cachedFantaBundle.lastScoredWeek,
    };
  }

  const [nflState, league, usersRaw, rostersRaw] = await Promise.all([
    fetchJson<any>("https://api.sleeper.app/v1/state/nfl"),
    fetchJson<any>(`https://api.sleeper.app/v1/league/${leagueId}`),
    fetchJson<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/users`),
    fetchJson<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
  ]);

  const candidateMaxWeek = Math.min(
    league.settings?.playoff_week_start
      ? league.settings.playoff_week_start - 1
      : 14,
    Math.max(1, Number(nflState?.week || league.settings?.leg || 11))
  );

  const weekNums = Array.from({ length: candidateMaxWeek }, (_, i) => i + 1);
  const [matchupsByWeek, txByWeek, playerMap] = await Promise.all([
    Promise.all(
      weekNums.map((w) =>
        fetchJson<any[]>(
          `https://api.sleeper.app/v1/league/${leagueId}/matchups/${w}`
        ).catch(() => [])
      )
    ),
    Promise.all(
      weekNums.map((w) =>
        fetchJson<any[]>(
          `https://api.sleeper.app/v1/league/${leagueId}/transactions/${w}`
        ).catch(() => [])
      )
    ),
    playerMapPromise,
  ]);

  let lastScoredWeek = 1;
  for (let i = matchupsByWeek.length - 1; i >= 0; i -= 1) {
    const mList = matchupsByWeek[i] || [];
    const totalPts = mList.reduce((sum, m) => sum + Number(m.points || 0), 0);
    // Completed week threshold (> 60 pts per team average across the league)
    if (totalPts > mList.length * 60) {
      lastScoredWeek = i + 1;
      break;
    }
  }

  const users = usersRaw.map((u) => ({
    id: u.user_id,
    name: formatFantaTeamDisplayName(u.metadata?.team_name, u.display_name),
    username: u.display_name || "manager",
    avatar: u.avatar || "",
  }));

  const rosters = rostersRaw.map((r) => ({
    id: r.owner_id,
    rosterId: r.roster_id,
    wins: r.settings?.wins ?? 0,
    losses: r.settings?.losses ?? 0,
    ties: r.settings?.ties ?? 0,
    pointsFor:
      Number(r.settings?.fpts ?? 0) +
      Number(r.settings?.fpts_decimal ?? 0) / 100,
    pointsAgainst:
      Number(r.settings?.fpts_against ?? 0) +
      Number(r.settings?.fpts_against_decimal ?? 0) / 100,
    potentialPoints:
      Number(r.settings?.ppts ?? 0) +
      Number(r.settings?.ppts_decimal ?? 0) / 100,
    managerEfficiency: 0.9,
    recordByWeek: r.metadata?.record || "",
    players: r.players || [],
  }));

  const weeklyPoints = rostersRaw.map((r) => {
    const rId = r.roster_id;
    const points: number[] = [];
    const matchups: number[] = [];
    const starters: string[][] = [];
    const starterPoints: number[][] = [];
    const benchPlayers: string[][] = [];
    const benchPoints: number[][] = [];

    for (let wIdx = 0; wIdx < weekNums.length; wIdx += 1) {
      const mEntry = (matchupsByWeek[wIdx] || []).find(
        (m) => m.roster_id === rId
      );
      points.push(Number(mEntry?.points ?? 0));
      matchups.push(Number(mEntry?.matchup_id ?? 0));
      const sIds: string[] = mEntry?.starters ?? [];
      const sPts: number[] = mEntry?.starters_points ?? [];
      starters.push(sIds);
      starterPoints.push(sPts);

      const starterSet = new Set(sIds);
      const bIds: string[] = (mEntry?.players ?? []).filter(
        (pid: string) => !starterSet.has(pid)
      );
      const pMap: Record<string, number> = mEntry?.players_points ?? {};
      const bPts: number[] = bIds.map((pid) => Number(pMap[pid] ?? 0));
      benchPlayers.push(bIds);
      benchPoints.push(bPts);
    }

    return {
      rosterId: rId,
      points,
      matchups,
      starters,
      starterPoints,
      benchPlayers,
      benchPoints,
    };
  });

  const allTransactions = txByWeek.flat();
  const waivers = allTransactions.filter(
    (t) =>
      t.status === "complete" &&
      (t.type === "waiver" || t.type === "free_agent")
  );
  const trades = allTransactions.filter(
    (t) => t.status === "complete" && t.type === "trade"
  );

  const txCounts: Record<string, number> = {};
  for (const t of allTransactions) {
    if (t.status === "complete" && t.creator) {
      txCounts[t.creator] = (txCounts[t.creator] ?? 0) + 1;
    }
  }

  const leagueInfo = {
    name: league.name || "Don't you want a fanta fanta fantasy league?",
    season: String(league.season || "2026"),
    seasonType:
      league.settings?.type === 2
        ? "Dynasty"
        : league.settings?.type === 1
          ? "Keeper"
          : "Redraft",
    totalRosters: league.total_rosters || rosters.length,
    playoffTeams: league.settings?.playoff_teams || 6,
    regularSeasonLength: league.settings?.playoff_week_start
      ? league.settings.playoff_week_start - 1
      : 14,
    lastScoredWeek,
    currentWeek: lastScoredWeek,
    scoringSettings: league.scoring_settings || {},
    scoringType:
      league.scoring_settings?.rec === 1
        ? 1
        : league.scoring_settings?.rec === 0.5
          ? 2
          : 0,
    leagueId,
    users,
    rosters,
    weeklyPoints,
    waivers,
    trades,
    transactions: txCounts,
  };

  cachedFantaBundle = {
    fetchedAt: now,
    leagueInfo,
    lastScoredWeek,
  };

  return { leagueInfo, playerMap, lastScoredWeek };
}
