export type LeagueFeatureGroup =
  | "Command Center"
  | "League Analysis"
  | "My Team & Tools"
  | "History & Media";

export const leagueFeatureGroups: readonly LeagueFeatureGroup[] = [
  "Command Center",
  "League Analysis",
  "My Team & Tools",
  "History & Media",
] as const;

export const leagueFeatures = [
  { id: "Home", slug: "home", group: "Command Center" },
  { id: "Dashboard", slug: "dashboard", group: "Command Center" },
  { id: "Start/Sit", slug: "start-sit", group: "Command Center" },
  {
    id: "Weekly Report",
    slug: "weekly-report",
    group: "Command Center",
    unavailableForGuillotine: true,
  },
  { id: "Standings", slug: "standings", group: "League Analysis" },
  { id: "Power Rankings", slug: "power-rankings", group: "League Analysis" },
  { id: "Expected Wins", slug: "expected-wins", group: "League Analysis" },
  {
    id: "Roster Management",
    slug: "roster-management",
    group: "League Analysis",
  },
  { id: "Playoffs", slug: "playoffs", group: "League Analysis" },
  {
    id: "Season Forecast",
    slug: "season-forecast",
    group: "League Analysis",
    unavailableForGuillotine: true,
  },
  { id: "Draft", slug: "draft", group: "League Analysis" },
  { id: "Player Values", slug: "player-values", group: "My Team & Tools" },
  { id: "Trade Lab", slug: "trade-lab", group: "My Team & Tools" },
  { id: "League History", slug: "league-history", group: "History & Media" },
  {
    id: "Manager Profiles",
    slug: "manager-profiles",
    group: "History & Media",
    unavailableForGuillotine: true,
  },
  {
    id: "Podcast",
    slug: "podcast",
    group: "History & Media",
    unavailableForGuillotine: true,
  },
  { id: "Wrapped", slug: "wrapped", group: "History & Media" },
  {
    id: "ESPN",
    slug: "espn",
    group: "Command Center",
    hiddenFromNavigation: true,
  },
] as const;

export type LeagueFeature = (typeof leagueFeatures)[number]["id"];
export type LeagueViewSlug = (typeof leagueFeatures)[number]["slug"];

export const customizableLeagueFeatures = [
  {
    id: "Expected Wins",
    description: "Expected records, luck, and schedule analysis.",
  },
  {
    id: "Start/Sit",
    description: "Weekly lineup recommendations.",
  },
  {
    id: "Season Forecast",
    description: "Rest-of-season schedule simulations.",
  },
  {
    id: "Trade Lab",
    description: "Trade comparisons and analysis.",
  },
  {
    id: "Manager Profiles",
    description: "Detailed manager tendencies and identities.",
  },
  {
    id: "Player Values",
    description: "League specific player rankings.",
  },
] as const satisfies ReadonlyArray<{
  id: LeagueFeature;
  description: string;
}>;

const customizableLeagueFeatureIds = new Set<LeagueFeature>(
  customizableLeagueFeatures.map(({ id }) => id)
);

export const isCustomizableLeagueFeature = (
  value: unknown
): value is (typeof customizableLeagueFeatures)[number]["id"] =>
  typeof value === "string" &&
  customizableLeagueFeatureIds.has(value as LeagueFeature);

const leagueFeatureIds = new Set<string>(
  leagueFeatures.map((feature) => feature.id)
);

const featureBySlug = new Map<string, LeagueFeature>(
  leagueFeatures.map((feature) => [feature.slug, feature.id])
);
featureBySlug.set("schedule-simulator", "Season Forecast");

const slugByFeature = new Map<LeagueFeature, LeagueViewSlug>(
  leagueFeatures.map((feature) => [feature.id, feature.slug])
);

export const isLeagueFeature = (value: string): value is LeagueFeature =>
  leagueFeatureIds.has(value);

export const normalizeLeagueFeature = (value: string): LeagueFeature => {
  if (value === "Schedule Simulator") return "Season Forecast";
  const fromSlug = getFeatureFromViewSlug(value);
  if (fromSlug) return fromSlug;
  return isLeagueFeature(value) ? value : "Standings";
};

export const getViewSlugForFeature = (
  feature: string
): LeagueViewSlug | undefined => {
  if (!isLeagueFeature(feature)) return undefined;
  return slugByFeature.get(feature);
};

export const getFeatureFromViewSlug = (
  value: unknown
): LeagueFeature | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  return featureBySlug.get(normalized) ?? null;
};

export const sidebarLeagueFeatures = leagueFeatures.filter(
  (feature) => !("hiddenFromNavigation" in feature)
);

export const isLeagueFeatureAvailable = (
  featureId: LeagueFeature,
  seasonType: string
) => {
  const feature = leagueFeatures.find(({ id }) => id === featureId);
  return !(
    seasonType === "Guillotine" &&
    feature &&
    "unavailableForGuillotine" in feature
  );
};
