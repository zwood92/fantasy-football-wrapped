<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  scriptData: {
    title: string;
    script: Array<{
      speaker: string;
      text: string;
    }>
  }
}>();

const getAvatar = (speaker: string) => {
  if (speaker.toLowerCase().includes('guru')) return '/avatars/avatar1.svg';
  if (speaker.toLowerCase().includes('comedian')) return '/avatars/avatar2.svg';
  return '/avatars/avatar3.svg'; // reporter
};

const getSpeakerColor = (speaker: string) => {
  if (speaker.toLowerCase().includes('guru')) return 'text-blue-500';
  if (speaker.toLowerCase().includes('comedian')) return 'text-primary';
  return 'text-green-500';
};
</script>

<template>
  <div>
    <h3 class="text-2xl font-bold text-center mb-8 uppercase tracking-wider">{{ scriptData.title }}</h3>
    
    <div class="space-y-6 max-w-3xl mx-auto">
      <div 
        v-for="(line, index) in scriptData.script" 
        :key="index"
        class="flex gap-4"
        :class="line.speaker.toLowerCase().includes('guru') ? 'flex-row' : 'flex-row-reverse'"
      >
        <img :src="getAvatar(line.speaker)" class="w-12 h-12 rounded-full border-2 border-primary bg-secondary shrink-0" />
        
        <div 
          class="rounded-xl p-4 max-w-[80%] shadow-sm"
          :class="line.speaker.toLowerCase().includes('guru') ? 'bg-secondary/50 rounded-tl-none' : 'bg-primary/10 rounded-tr-none'"
        >
          <div class="text-sm font-bold mb-1 uppercase tracking-wide" :class="getSpeakerColor(line.speaker)">
            {{ line.speaker }}
          </div>
          <div class="text-foreground leading-relaxed">
            {{ line.text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
