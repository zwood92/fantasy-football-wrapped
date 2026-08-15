<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps<{
  initialPersonas: {
    guru: string;
    comedian: string;
    reporter: string;
  }
}>();

const emit = defineEmits(['save']);

const personas = ref({ ...props.initialPersonas });

watch(() => props.initialPersonas, (newVal) => {
  personas.value = { ...newVal };
}, { deep: true });

const save = () => {
  emit('save', { ...personas.value });
};
</script>

<template>
  <div class="mt-8 border-t pt-8">
    <h3 class="text-xl font-bold mb-4">Customize AI Personas</h3>
    <p class="text-muted-foreground mb-6 text-sm">
      Adjust the prompt instructions for each of the three podcast hosts to change their personality and tone.
    </p>
    
    <div class="space-y-4">
      <div class="grid gap-2">
        <Label for="guru">The Analytical Guru</Label>
        <Input id="guru" v-model="personas.guru" />
      </div>
      
      <div class="grid gap-2">
        <Label for="comedian">The Comedian</Label>
        <Input id="comedian" v-model="personas.comedian" />
      </div>
      
      <div class="grid gap-2">
        <Label for="reporter">The Beat Reporter</Label>
        <Input id="reporter" v-model="personas.reporter" />
      </div>
      
      <Button @click="save" variant="outline" class="mt-4">
        Save Personas
      </Button>
    </div>
  </div>
</template>
