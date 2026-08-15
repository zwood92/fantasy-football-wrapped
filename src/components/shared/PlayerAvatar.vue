<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  getInjuryBadgeColorClass,
  getPlayerHeadshotUrl,
  getPlayerInitials,
  getPositionBadgeColorClass,
  getTeamLogoUrl,
  isDefense,
  normalizeTeamAbbreviation,
} from "@/lib/playerHeadshots";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const props = withDefaults(
  defineProps<{
    playerId?: string | null;
    name?: string | null;
    team?: string | null;
    position?: string | null;
    size?: AvatarSize;
    showInjuryBadge?: boolean;
    injuryStatus?: string | null;
    showPositionBadge?: boolean;
    showTeamLogoBadge?: boolean;
    alt?: string;
    lazy?: boolean;
  }>(),
  {
    playerId: undefined,
    name: undefined,
    team: undefined,
    position: undefined,
    size: "md",
    showInjuryBadge: false,
    injuryStatus: undefined,
    showPositionBadge: false,
    showTeamLogoBadge: false,
    alt: undefined,
    lazy: true,
  }
);

const isImgLoaded = ref(false);
const hasImgError = ref(false);
const triedTeamFallback = ref(false);

// Reset error states if player changes
watch(
  () => [props.playerId, props.name, props.team, props.position],
  () => {
    isImgLoaded.value = false;
    hasImgError.value = false;
    triedTeamFallback.value = false;
  }
);

const isDef = computed(() =>
  isDefense(props.playerId, props.position, props.name)
);

const teamAbbr = computed(() =>
  normalizeTeamAbbreviation(
    props.team || (isDef.value ? props.playerId || props.name : undefined)
  )
);

const initials = computed(() => getPlayerInitials(props.name));

const primaryImageUrl = computed(() => {
  if (isDef.value) {
    return getTeamLogoUrl(props.team || props.playerId || props.name);
  }
  if (triedTeamFallback.value) {
    return getTeamLogoUrl(props.team);
  }
  if (props.playerId && props.playerId !== "0") {
    return getPlayerHeadshotUrl(props.playerId);
  }
  if (props.team) {
    return getTeamLogoUrl(props.team);
  }
  return "";
});

const handleImageError = () => {
  if (!isDef.value && !triedTeamFallback.value && props.team) {
    triedTeamFallback.value = true;
    isImgLoaded.value = false;
  } else {
    hasImgError.value = true;
    isImgLoaded.value = false;
  }
};

const handleImageLoad = () => {
  isImgLoaded.value = true;
};

// Size dimension and text classes
const sizeClasses = computed(() => {
  switch (props.size) {
    case "xs":
      return "size-6 text-[9px]";
    case "sm":
      return "size-8 text-[11px]";
    case "md":
      return "size-9 text-xs";
    case "lg":
      return "size-11 text-sm";
    case "xl":
      return "size-14 text-base";
    case "2xl":
      return "size-16 text-lg";
    default:
      return "size-9 text-xs";
  }
});

// Position badge size class
const posBadgeSizeClasses = computed(() => {
  switch (props.size) {
    case "xs":
    case "sm":
      return "text-[8px] px-0.5 py-0 -bottom-1 -right-1";
    case "md":
      return "text-[9px] px-1 py-0 -bottom-1 -right-1";
    case "lg":
    case "xl":
    case "2xl":
      return "text-[10px] px-1.5 py-0.5 -bottom-1 -right-1";
    default:
      return "text-[9px] px-1 py-0 -bottom-1 -right-1";
  }
});

// Injury badge size class
const injuryBadgeSizeClasses = computed(() => {
  switch (props.size) {
    case "xs":
    case "sm":
      return "text-[8px] px-1 py-0 -top-1 -right-1";
    case "md":
      return "text-[9px] px-1 py-0 -top-1 -right-1";
    case "lg":
    case "xl":
    case "2xl":
      return "text-[10px] px-1.5 py-0.5 -top-1 -right-1";
    default:
      return "text-[9px] px-1 py-0 -top-1 -right-1";
  }
});

const altText = computed(() => {
  if (props.alt) return props.alt;
  if (props.name) {
    return `${props.name}${props.position ? `, ${props.position}` : ""}${
      props.team ? ` - ${props.team}` : ""
    }`;
  }
  return "Player Avatar";
});
</script>

<template>
  <div class="relative inline-flex shrink-0 select-none">
    <!-- Main Avatar Container -->
    <div
      class="relative overflow-hidden rounded-full border border-border/80 bg-muted/60 flex items-center justify-center font-semibold text-muted-foreground shadow-2xs"
      :class="[
        sizeClasses,
        isDef ? 'bg-background/90 dark:bg-muted/40' : '',
      ]"
    >
      <!-- Fallback Initials / Position Text shown when loading or on error -->
      <span
        v-if="!isImgLoaded || hasImgError || !primaryImageUrl"
        class="absolute inset-0 flex items-center justify-center font-bold tracking-tight select-none uppercase text-muted-foreground"
      >
        {{ initials }}
      </span>

      <!-- Player Headshot / Team Logo Image -->
      <img
        v-if="primaryImageUrl && !hasImgError"
        :src="primaryImageUrl"
        :alt="altText"
        :loading="lazy ? 'lazy' : 'eager'"
        decoding="async"
        class="relative z-10 w-full h-full transition-opacity duration-200"
        :class="[
          isImgLoaded ? 'opacity-100' : 'opacity-0',
          isDef || triedTeamFallback ? 'object-contain p-1 bg-background/80' : 'object-cover',
        ]"
        @load="handleImageLoad"
        @error="handleImageError"
      />
    </div>

    <!-- Small Positional Badge Overlay -->
    <span
      v-if="showPositionBadge && position"
      class="absolute z-20 font-bold uppercase rounded-xs border shadow-xs leading-none ring-1 ring-background"
      :class="[
        posBadgeSizeClasses,
        getPositionBadgeColorClass(position),
      ]"
    >
      {{ position }}
    </span>

    <!-- Small Injury Badge Overlay -->
    <span
      v-if="showInjuryBadge && injuryStatus"
      class="absolute z-20 font-black uppercase rounded shadow-xs leading-none ring-1 ring-background"
      :class="[
        injuryBadgeSizeClasses,
        getInjuryBadgeColorClass(injuryStatus),
      ]"
    >
      {{ injuryStatus }}
    </span>

    <!-- Optional Team Logo Mini-Pill Badge Overlay -->
    <span
      v-if="showTeamLogoBadge && teamAbbr && !isDef"
      class="absolute -bottom-1 -left-1 z-20 size-3.5 sm:size-4 rounded-full bg-background border border-border p-0.5 shadow-xs overflow-hidden flex items-center justify-center ring-1 ring-background"
    >
      <img
        :src="getTeamLogoUrl(teamAbbr)"
        :alt="teamAbbr"
        class="w-full h-full object-contain"
        loading="lazy"
      />
    </span>
  </div>
</template>
