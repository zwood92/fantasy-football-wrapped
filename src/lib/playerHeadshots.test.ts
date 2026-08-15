import { describe, expect, it } from "vitest";
import {
  getInjuryBadgeColorClass,
  getPlayerHeadshotUrl,
  getPlayerInitials,
  getPositionBadgeColorClass,
  getTeamLogoUrl,
  isDefense,
  normalizeTeamAbbreviation,
} from "./playerHeadshots";

describe("playerHeadshots", () => {
  describe("getPlayerHeadshotUrl", () => {
    it("generates correct thumbnail url for player id", () => {
      expect(getPlayerHeadshotUrl("6794")).toBe(
        "https://sleepercdn.com/content/nfl/players/thumb/6794.jpg"
      );
    });

    it("generates full-size url when thumb option is false", () => {
      expect(getPlayerHeadshotUrl("6794", { thumb: false })).toBe(
        "https://sleepercdn.com/content/nfl/players/6794.jpg"
      );
    });

    it("returns empty string for missing or invalid IDs", () => {
      expect(getPlayerHeadshotUrl("")).toBe("");
      expect(getPlayerHeadshotUrl(null)).toBe("");
      expect(getPlayerHeadshotUrl(undefined)).toBe("");
      expect(getPlayerHeadshotUrl("0")).toBe("");
    });
  });

  describe("getTeamLogoUrl", () => {
    it("generates team logo url for valid team codes", () => {
      expect(getTeamLogoUrl("KC")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/kc.png"
      );
      expect(getTeamLogoUrl("sf")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/sf.png"
      );
    });

    it("normalizes full team names to logo url", () => {
      expect(getTeamLogoUrl("San Francisco 49ers")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/sf.png"
      );
      expect(getTeamLogoUrl("Kansas City Chiefs")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/kc.png"
      );
      expect(getTeamLogoUrl("New England Patriots")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/ne.png"
      );
    });

    it("handles defense suffix correctly", () => {
      expect(getTeamLogoUrl("NE Defense")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/ne.png"
      );
      expect(getTeamLogoUrl("BAL D/ST")).toBe(
        "https://sleepercdn.com/images/team_logos/nfl/bal.png"
      );
    });

    it("returns empty string when team is missing", () => {
      expect(getTeamLogoUrl("")).toBe("");
      expect(getTeamLogoUrl(null)).toBe("");
      expect(getTeamLogoUrl(undefined)).toBe("");
    });
  });

  describe("isDefense", () => {
    it("detects defense by position", () => {
      expect(isDefense("1234", "DEF")).toBe(true);
      expect(isDefense("1234", "DST")).toBe(true);
      expect(isDefense("1234", "D/ST")).toBe(true);
      expect(isDefense("1234", "QB")).toBe(false);
    });

    it("detects defense by name", () => {
      expect(isDefense(undefined, undefined, "San Francisco Defense")).toBe(true);
      expect(isDefense(undefined, undefined, "Cowboys D/ST")).toBe(true);
      expect(isDefense(undefined, undefined, "Patrick Mahomes")).toBe(false);
    });

    it("detects defense by team abbreviation as playerId", () => {
      expect(isDefense("SF")).toBe(true);
      expect(isDefense("KC")).toBe(true);
      expect(isDefense("NE")).toBe(true);
      expect(isDefense("6794")).toBe(false);
    });
  });

  describe("getPlayerInitials", () => {
    it("extracts 2-letter initials for first and last name", () => {
      expect(getPlayerInitials("Patrick Mahomes")).toBe("PM");
      expect(getPlayerInitials("Christian McCaffrey")).toBe("CM");
      expect(getPlayerInitials("Justin Jefferson")).toBe("JJ");
    });

    it("handles single-word names", () => {
      expect(getPlayerInitials("Mahomes")).toBe("MA");
    });

    it("handles names with punctuation and suffixes", () => {
      expect(getPlayerInitials("C.J. Stroud")).toBe("CS");
      expect(getPlayerInitials("Marvin Harrison Jr.")).toBe("MJ");
    });

    it("returns ? for missing or empty names", () => {
      expect(getPlayerInitials("")).toBe("?");
      expect(getPlayerInitials(null)).toBe("?");
      expect(getPlayerInitials(undefined)).toBe("?");
    });
  });

  describe("normalizeTeamAbbreviation", () => {
    it("maps city or team name variations to standard abbreviations", () => {
      expect(normalizeTeamAbbreviation("Chiefs")).toBe("kc");
      expect(normalizeTeamAbbreviation("49ers")).toBe("sf");
      expect(normalizeTeamAbbreviation("Cowboys")).toBe("dal");
      expect(normalizeTeamAbbreviation("Patriots")).toBe("ne");
    });
  });

  describe("getPositionBadgeColorClass", () => {
    it("returns appropriate color classes for standard positions", () => {
      expect(getPositionBadgeColorClass("QB")).toContain("rose");
      expect(getPositionBadgeColorClass("RB")).toContain("emerald");
      expect(getPositionBadgeColorClass("WR")).toContain("sky");
      expect(getPositionBadgeColorClass("TE")).toContain("amber");
      expect(getPositionBadgeColorClass("DEF")).toContain("slate");
    });
  });

  describe("getInjuryBadgeColorClass", () => {
    it("returns proper alert styling for injury statuses", () => {
      expect(getInjuryBadgeColorClass("O")).toContain("bg-rose-600");
      expect(getInjuryBadgeColorClass("IR")).toContain("bg-rose-700");
      expect(getInjuryBadgeColorClass("Q")).toContain("bg-amber-500");
      expect(getInjuryBadgeColorClass("D")).toContain("bg-orange-600");
    });
  });
});
