/**
 * NFL Player Headshot & Team Logo Utilities
 * Integrates Sleeper CDN for official NFL headshots, team logos, and fallback handling.
 */

export const NFL_TEAM_ABBREVIATIONS = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "JAC",
  "KC", "KAN", "LAC", "LAR", "LA", "LV", "LVR", "OAK",
  "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT",
  "SEA", "SF", "TB", "TEN", "WAS", "WSH",
]);

export const NFL_TEAM_MAP: Record<string, string> = {
  ari: "ari",
  arizona: "ari",
  cardinals: "ari",
  "arizona cardinals": "ari",
  atl: "atl",
  atlanta: "atl",
  falcons: "atl",
  "atlanta falcons": "atl",
  bal: "bal",
  baltimore: "bal",
  ravens: "bal",
  "baltimore ravens": "bal",
  buf: "buf",
  buffalo: "buf",
  bills: "buf",
  "buffalo bills": "buf",
  car: "car",
  carolina: "car",
  panthers: "car",
  "carolina panthers": "car",
  chi: "chi",
  chicago: "chi",
  bears: "chi",
  "chicago bears": "chi",
  cin: "cin",
  cincinnati: "cin",
  bengals: "cin",
  "cincinnati bengals": "cin",
  cle: "cle",
  cleveland: "cle",
  browns: "cle",
  "cleveland browns": "cle",
  dal: "dal",
  dallas: "dal",
  cowboys: "dal",
  "dallas cowboys": "dal",
  den: "den",
  denver: "den",
  broncos: "den",
  "denver broncos": "den",
  det: "det",
  detroit: "det",
  lions: "det",
  "detroit lions": "det",
  gb: "gb",
  "green bay": "gb",
  packers: "gb",
  "green bay packers": "gb",
  hou: "hou",
  houston: "hou",
  texans: "hou",
  "houston texans": "hou",
  ind: "ind",
  indianapolis: "ind",
  colts: "ind",
  "indianapolis colts": "ind",
  jax: "jax",
  jac: "jax",
  jacksonville: "jax",
  jaguars: "jax",
  "jacksonville jaguars": "jax",
  kc: "kc",
  kan: "kc",
  "kansas city": "kc",
  chiefs: "kc",
  "kansas city chiefs": "kc",
  lac: "lac",
  sd: "lac",
  "los angeles chargers": "lac",
  "la chargers": "lac",
  chargers: "lac",
  lar: "lar",
  la: "lar",
  "los angeles rams": "lar",
  "la rams": "lar",
  rams: "lar",
  lv: "lv",
  lvr: "lv",
  oak: "lv",
  "las vegas": "lv",
  raiders: "lv",
  "las vegas raiders": "lv",
  mia: "mia",
  miami: "mia",
  dolphins: "mia",
  "miami dolphins": "mia",
  min: "min",
  minnesota: "min",
  vikings: "min",
  "minnesota vikings": "min",
  ne: "ne",
  "new england": "ne",
  patriots: "ne",
  "new england patriots": "ne",
  no: "no",
  "new orleans": "no",
  saints: "no",
  "new orleans saints": "no",
  nyg: "nyg",
  "new york giants": "nyg",
  "ny giants": "nyg",
  giants: "nyg",
  nyj: "nyj",
  "new york jets": "nyj",
  "ny jets": "nyj",
  jets: "nyj",
  phi: "phi",
  philadelphia: "phi",
  eagles: "phi",
  "philadelphia eagles": "phi",
  pit: "pit",
  pittsburgh: "pit",
  steelers: "pit",
  "pittsburgh steelers": "pit",
  sea: "sea",
  seattle: "sea",
  seahawks: "sea",
  "seattle seahawks": "sea",
  sf: "sf",
  "san francisco": "sf",
  "49ers": "sf",
  "san francisco 49ers": "sf",
  niners: "sf",
  tb: "tb",
  "tampa bay": "tb",
  buccaneers: "tb",
  bucs: "tb",
  "tampa bay buccaneers": "tb",
  ten: "ten",
  tennessee: "ten",
  titans: "ten",
  "tennessee titans": "ten",
  was: "was",
  wsh: "was",
  washington: "was",
  commanders: "was",
  "washington commanders": "was",
};

/**
 * Normalizes any NFL team identifier (name, abbreviation, defense name) to standard Sleeper key.
 */
export function normalizeTeamAbbreviation(team?: string | null): string {
  if (!team) return "";
  const cleaned = team
    .trim()
    .toLowerCase()
    .replace(/\s+defense$/i, "")
    .replace(/\s+d\/st$/i, "")
    .replace(/\s+dst$/i, "")
    .trim();
  return NFL_TEAM_MAP[cleaned] || cleaned;
}

/**
 * Checks if the entity is a team defense rather than an individual offensive/IDP player.
 */
export function isDefense(
  playerId?: string | null,
  position?: string | null,
  name?: string | null
): boolean {
  if (
    position &&
    (position.toUpperCase() === "DEF" ||
      position.toUpperCase() === "DST" ||
      position.toUpperCase() === "D/ST")
  ) {
    return true;
  }
  if (name && /defense|d\/st|dst/i.test(name)) {
    return true;
  }
  if (
    playerId &&
    !/^\d+$/.test(playerId) &&
    NFL_TEAM_ABBREVIATIONS.has(playerId.toUpperCase())
  ) {
    return true;
  }
  return false;
}

/**
 * Returns the Sleeper CDN URL for an NFL player headshot.
 */
export function getPlayerHeadshotUrl(
  playerId?: string | null,
  options?: { thumb?: boolean }
): string {
  if (!playerId || playerId === "0" || playerId.trim() === "") return "";
  const thumb = options?.thumb !== false;
  const path = thumb ? `thumb/${playerId.trim()}.jpg` : `${playerId.trim()}.jpg`;
  return `https://sleepercdn.com/content/nfl/players/${path}`;
}

/**
 * Returns the Sleeper CDN URL for an NFL team logo.
 */
export function getTeamLogoUrl(team?: string | null): string {
  const norm = normalizeTeamAbbreviation(team);
  if (!norm) return "";
  return `https://sleepercdn.com/images/team_logos/nfl/${norm.toLowerCase()}.png`;
}

/**
 * Extracts clean 1-2 character initials from a player's name.
 */
export function getPlayerInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name
    .trim()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns Tailwind background/text classes for standard fantasy football position badges.
 */
export function getPositionBadgeColorClass(position?: string | null): string {
  const pos = position?.toUpperCase().trim();
  switch (pos) {
    case "QB":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
    case "RB":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "WR":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
    case "TE":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "K":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    case "DEF":
    case "DST":
    case "D/ST":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/**
 * Returns Tailwind classes for NFL injury designation badges.
 */
export function getInjuryBadgeColorClass(status?: string | null): string {
  const s = status?.toUpperCase().trim();
  switch (s) {
    case "O":
    case "OUT":
      return "bg-rose-600 text-white font-bold";
    case "IR":
    case "I/R":
      return "bg-rose-700 text-white font-bold";
    case "D":
    case "DOUBTFUL":
      return "bg-orange-600 text-white font-semibold";
    case "Q":
    case "QUESTIONABLE":
      return "bg-amber-500 text-black font-bold";
    case "PUP":
      return "bg-purple-700 text-white font-semibold";
    case "SUS":
    case "SSPD":
      return "bg-zinc-700 text-white font-semibold";
    case "COV":
    case "COVID":
      return "bg-stone-600 text-white font-semibold";
    default:
      return "bg-muted-foreground text-background font-semibold";
  }
}
