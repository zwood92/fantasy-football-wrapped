import { describe, expect, test } from "vitest";
import {
  getFeatureFromViewSlug,
  getViewSlugForFeature,
  leagueFeatureGroups,
  normalizeLeagueFeature,
  sidebarLeagueFeatures,
} from "../src/lib/features";

describe("league features registry and view slugs", () => {
  test("maps every sidebar feature to a unique URL slug and back", () => {
    const slugs = new Set<string>();
    for (const feature of sidebarLeagueFeatures) {
      const slug = getViewSlugForFeature(feature.id);
      expect(slug).toBeTruthy();
      expect(slugs.has(slug!)).toBe(false);
      slugs.add(slug!);
      expect(getFeatureFromViewSlug(slug)).toBe(feature.id);
      expect(leagueFeatureGroups).toContain(feature.group);
    }
  });

  test("resolves legacy aliases, arrays, and casing safely", () => {
    expect(getFeatureFromViewSlug("schedule-simulator")).toBe(
      "Season Forecast"
    );
    expect(getFeatureFromViewSlug(["POWER-RANKINGS"])).toBe("Power Rankings");
    expect(getFeatureFromViewSlug("unknown-view")).toBeNull();
    expect(getFeatureFromViewSlug(undefined)).toBeNull();
    expect(normalizeLeagueFeature("Schedule Simulator")).toBe(
      "Season Forecast"
    );
    expect(normalizeLeagueFeature("trade-lab")).toBe("Trade Lab");
    expect(normalizeLeagueFeature("garbage")).toBe("Standings");
  });
});
