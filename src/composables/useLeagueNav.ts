import { computed } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { useStore } from "@/store/store";
import {
  getFeatureFromViewSlug,
  getViewSlugForFeature,
  type LeagueFeature,
} from "@/lib/features";
import { clearPendingCheckout } from "@/lib/pendingCheckout";

const TRANSIENT_QUERY_KEYS = [
  "intent",
  "upgrade_source",
  "destination",
  "tradeMode",
  "tradePlayerId",
  "tradeRosterId",
] as const;

export const useLeagueNav = () => {
  const store = useStore();
  const route = useRoute();
  const router = useRouter();

  const currentViewSlug = computed(() =>
    getViewSlugForFeature(store.currentTab)
  );

  const buildCleanQuery = (
    extraQuery?: Record<string, string | number | null | undefined>
  ): LocationQueryRaw => {
    const nextQuery: LocationQueryRaw = { ...route.query };
    for (const key of TRANSIENT_QUERY_KEYS) {
      delete nextQuery[key];
    }
    if (extraQuery) {
      for (const [key, value] of Object.entries(extraQuery)) {
        if (value === undefined || value === null || value === "") {
          delete nextQuery[key];
        } else {
          nextQuery[key] = String(value);
        }
      }
    }
    return nextQuery;
  };

  const goToFeature = (
    feature: LeagueFeature,
    extraQuery?: Record<string, string | number | null | undefined>
  ) => {
    clearPendingCheckout();
    store.currentTab = feature;
    localStorage.setItem("currentTab", feature);

    const slug = getViewSlugForFeature(feature);
    const nextQuery = buildCleanQuery({
      ...extraQuery,
      view: feature === "Home" ? undefined : slug,
    });

    if (route.path !== "/") {
      void router.push({ path: "/", query: nextQuery });
    } else {
      void router.replace({ path: "/", query: nextQuery });
    }
  };

  const goToView = (
    slug: string,
    extraQuery?: Record<string, string | number | null | undefined>
  ) => {
    const feature = getFeatureFromViewSlug(slug);
    if (!feature) return false;
    goToFeature(feature, extraQuery);
    return true;
  };

  return {
    currentViewSlug,
    goToFeature,
    goToView,
  };
};
