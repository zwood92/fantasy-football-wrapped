<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
    <h1 class="text-4xl font-bold tracking-tight text-primary md:text-6xl">
      Welcome to Your League Hub
    </h1>
    <p class="mt-4 text-lg text-muted-foreground max-w-2xl">
      Your permanent home for AI-generated weekly newsletters, hilarious podcasts, and all-time record books.
    </p>
    <div class="flex flex-wrap gap-4 mt-8">
      <button @click="router.push('/newsletters')" class="px-6 py-3 font-semibold text-white rounded-md bg-primary hover:bg-primary/90">
        Read Newsletters
      </button>
      <button @click="router.push('/podcasts')" class="px-6 py-3 font-semibold bg-transparent border rounded-md border-primary text-primary hover:bg-accent hover:text-accent-foreground">
        Listen to Podcasts
      </button>
    </div>
  </div>
</template>
