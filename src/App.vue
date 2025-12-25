<script setup lang="ts">
import { ref } from 'vue'
import SchemaCanvas from './components/SchemaCanvas.vue'
import Toolbar from './components/Toolbar.vue'
</script>

<template>
  <div class="w-full h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-gray-900">Drizzle Schema Designer</h1>
        <span class="text-sm text-gray-500">Visual database schema builder</span>
      </div>
    </header>

    <!-- Toolbar -->
    <Toolbar />

    <!-- Canvas -->
    <main class="flex-1 overflow-hidden">
      <SchemaCanvas />
    </main>
  </div>
</template>
