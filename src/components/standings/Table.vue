<script setup lang="ts">
import LeagueWorkspace from "../layout/LeagueWorkspace.vue";
import type { PointsType, RosterType, UserType } from "../../types/types";

defineProps<{
  users: UserType[];
  rosters: RosterType[];
  points: PointsType[];
}>();
</script>

<template>
  <LeagueWorkspace :users="users" :rosters="rosters" :points="points" />
</template>
