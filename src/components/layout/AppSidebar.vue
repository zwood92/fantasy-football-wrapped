<script setup lang="ts">
import { computed, ref, type Component } from "vue";
import type { SidebarProps } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  ChartColumn,
  ChartNoAxesCombined,
  ChevronDown,
  FolderClock,
  Gift,
  Home,
  Move3D,
  Newspaper,
  NotebookPen,
  TicketPercent,
  Trophy,
  Users,
  Info,
  ScrollText,
  ShieldUser,
  CircleUserRound,
  BadgeCheck,
  Handshake,
  Dices,
  FlaskConical,
  IdCard,
  LayoutDashboard,
  ListOrdered,
  Mic,
} from "@lucide/vue";
import { Separator } from "../ui/separator";
import { useStore } from "../../store/store";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { clearPendingCheckout } from "@/lib/pendingCheckout";
import {
  isLeagueFeatureAvailable,
  leagueFeatureGroups,
  sidebarLeagueFeatures,
  type LeagueFeature,
  type LeagueFeatureGroup,
} from "@/lib/features";
import { useLeagueNav } from "@/composables/useLeagueNav";
import { getParsedStorageItem } from "@/lib/storage";

const store = useStore();
const authStore = useAuthStore();
const subStore = useSubscriptionStore();
const route = useRoute();
const props = defineProps<SidebarProps>();
const { isMobile, setOpenMobile } = useSidebar();
const { goToFeature } = useLeagueNav();

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const collapsedGroups = ref<string[]>(
  getParsedStorageItem<string[]>("collapsedSidebarGroups", [], {
    isValid: isStringArray,
  })
);

const toggleGroup = (group: LeagueFeatureGroup) => {
  if (collapsedGroups.value.includes(group)) {
    collapsedGroups.value = collapsedGroups.value.filter((g) => g !== group);
  } else {
    collapsedGroups.value = [...collapsedGroups.value, group];
  }
  localStorage.setItem(
    "collapsedSidebarGroups",
    JSON.stringify(collapsedGroups.value)
  );
};

const isGroupCollapsed = (group: LeagueFeatureGroup) =>
  collapsedGroups.value.includes(group);

const currentUser = computed(() => {
  if (authStore.isAuthenticated) {
    return authStore.user?.email?.match(/^[^@]+(?=@)/)?.[0] ?? "";
  }
});

const defaultRouteQuery = computed(() => {
  const {
    intent,
    upgrade_source,
    destination,
    tradeMode,
    tradePlayerId,
    tradeRosterId,
    view,
    ...query
  } = route.query;
  return query;
});

const defaultAccountRoute = computed(() => ({
  path: "/account",
  query: defaultRouteQuery.value,
}));

const closeMobileSidebar = () => {
  if (isMobile.value) {
    setOpenMobile(false);
  }
};

const RouteTabChange = () => {
  clearPendingCheckout();
  if (isMobile.value) {
    setOpenMobile(false);
  }
};

const changeTab = (tab: LeagueFeature) => {
  goToFeature(tab);
  closeMobileSidebar();
};

const featureIcons: Record<LeagueFeature, Component> = {
  Home,
  Dashboard: LayoutDashboard,
  Standings: ChartColumn,
  "Power Rankings": ChartNoAxesCombined,
  "Expected Wins": TicketPercent,
  "Roster Management": Move3D,
  "Weekly Report": NotebookPen,
  Playoffs: Trophy,
  "Player Values": ListOrdered,
  "Trade Lab": FlaskConical,
  "Start/Sit": Newspaper,
  "Season Forecast": Dices,
  Draft: Users,
  "League History": FolderClock,
  "Manager Profiles": IdCard,
  Podcast: Mic,
  Wrapped: Gift,
  ESPN: ChartColumn,
};

const showHomeTab = computed(
  () =>
    !store.currentLeagueId && !route.query.leagueId && !store.loadingLeague
);

const seasonType = computed(() => store.currentLeague?.seasonType ?? "");

const navGroups = computed(() =>
  leagueFeatureGroups
    .map((group) => {
      const items = sidebarLeagueFeatures
        .filter((feature) => feature.group === group)
        .filter((feature) => store.isLeagueFeatureVisible(feature.id))
        .filter((feature) => isLeagueFeatureAvailable(feature.id, seasonType.value))
        .filter((feature) => feature.id !== "Home" || showHomeTab.value)
        .map((feature) => ({
          title: feature.id,
          icon: featureIcons[feature.id],
        }));
      return {
        group,
        items,
      };
    })
    .filter((section) => section.items.length > 0)
);
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            class="flex items-center ml-2 mt-1.5 cursor-pointer"
            @click="changeTab('Home')"
          >
            <img
              height="32"
              width="32"
              src="../../assets/logo.webp"
              class="-mx-1"
              alt="ffwrapped logo"
            />
            <span
              class="self-center -mb-1.5 ml-2.5 custom-font whitespace-nowrap"
              ><span class="text-primary">ff</span>wrapped</span
            >
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <Separator
      orientation="horizontal"
      class="mr-2 mt-2 data-[orientation=vertical]:h-4"
    />
    <SidebarContent>
      <SidebarGroup
        v-for="section in navGroups"
        :key="section.group"
        class="py-1"
      >
        <button
          type="button"
          class="flex items-center justify-between w-full px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
          :aria-expanded="!isGroupCollapsed(section.group)"
          @click="toggleGroup(section.group)"
        >
          <span>{{ section.group }}</span>
          <ChevronDown
            class="w-3.5 h-3.5 transition-transform duration-150"
            :class="isGroupCollapsed(section.group) ? '-rotate-90' : ''"
          />
        </button>
        <SidebarGroupContent v-show="!isGroupCollapsed(section.group)">
          <SidebarMenu>
            <SidebarMenuItem
              v-for="childItem in section.items"
              :key="childItem.title"
            >
              <SidebarMenuButton
                as-child
                :is-active="
                  route.path === '/' && store.currentTab === childItem.title
                "
                @click="changeTab(childItem.title)"
                class="cursor-pointer"
              >
                <div>
                  <component :is="childItem.icon" v-if="childItem.icon" />
                  <p>
                    {{ childItem.title }}
                  </p>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup class="mt-auto">
        <Separator
          orientation="horizontal"
          class="mr-2 mb-2 data-[orientation=vertical]:h-4"
        />
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/newsletters', query: defaultRouteQuery }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/newsletters'"
                  as-child
                >
                  <div>
                    <Newspaper />
                    Newsletters Archive
                  </div>
                </SidebarMenuButton>
              </router-link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/podcasts', query: defaultRouteQuery }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/podcasts'"
                  as-child
                >
                  <div>
                    <Mic />
                    Podcasts Archive
                  </div>
                </SidebarMenuButton>
              </router-link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/about', query: defaultRouteQuery }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/about'"
                  as-child
                >
                  <div>
                    <Info />
                    About
                  </div>
                </SidebarMenuButton>
              </router-link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/changelog', query: defaultRouteQuery }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/changelog'"
                  as-child
                >
                  <div>
                    <ScrollText />
                    Changelog
                  </div>
                </SidebarMenuButton>
              </router-link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/privacy', query: defaultRouteQuery }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  as-child
                  :is-active="route.path === '/privacy'"
                >
                  <div>
                    <ShieldUser />
                    Privacy Policy
                  </div>
                </SidebarMenuButton></router-link
              >
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="{ path: '/terms', query: defaultRouteQuery }"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  as-child
                  :is-active="route.path === '/terms'"
                >
                  <div>
                    <Handshake />
                    Terms of Service
                  </div>
                </SidebarMenuButton></router-link
              >
            </SidebarMenuItem>
            <SidebarMenuItem>
              <router-link
                :to="defaultAccountRoute"
                class="cursor-pointer"
                @click="RouteTabChange"
              >
                <SidebarMenuButton
                  :is-active="route.path === '/account'"
                  as-child
                >
                  <div>
                    <CircleUserRound />
                    Account
                    <span
                      v-if="authStore.isAuthenticated && !subStore.isPremium"
                      >({{ currentUser?.slice(0, 16) }})</span
                    >
                    <span
                      class="flex"
                      v-else-if="
                        authStore.isAuthenticated && subStore.isPremium
                      "
                      >({{ currentUser?.slice(0, 16)
                      }}<BadgeCheck class="mt-0.5 ml-2" :size="15" />)</span
                    >
                  </div>
                </SidebarMenuButton>
              </router-link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
<style scoped>
.custom-font {
  font-family: "Josefin Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: 600;
  font-style: normal;
  font-size: 1.6rem;
}
</style>
