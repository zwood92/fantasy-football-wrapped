<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/store/store";
import { getManagerDisplayName } from "@/lib/manager";
import type { TableDataType } from "@/types/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const props = defineProps<{
  teams: TableDataType[];
  label?: string;
}>();

const store = useStore();

const selectedValue = computed({
  get() {
    const id = store.currentSelectedRosterId ?? props.teams[0]?.rosterId;
    return id !== undefined && id !== null ? String(id) : "";
  },
  set(val: string) {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) {
      store.setSelectedRosterId(parsed);
    }
  },
});

const getTeamLabel = (team: TableDataType) =>
  getManagerDisplayName(team, store.showUsernames);
</script>

<template>
  <div v-if="teams.length > 0" class="flex items-center gap-2">
    <span v-if="label" class="text-xs font-medium text-muted-foreground">
      {{ label }}
    </span>
    <Select v-model="selectedValue">
      <SelectTrigger class="h-8 w-[190px] text-xs">
        <SelectValue placeholder="Select team" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="team in teams"
          :key="team.rosterId"
          :value="String(team.rosterId)"
        >
          {{ getTeamLabel(team) }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
