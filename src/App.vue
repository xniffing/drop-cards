<script setup lang="ts">
import { ref } from 'vue'
import SchemaCanvas from './components/SchemaCanvas.vue'
import Toolbar from './components/Toolbar.vue'
import DebugPanel from './components/DebugPanel.vue'
import ChatAside from './components/ChatAside.vue'
import { useSchemaProvider } from './composables/useSchema'
import { useTheme } from './composables/useTheme'

// Initialize schema provider
useSchemaProvider()

// Initialize theme
useTheme()

const showChat = ref(false)
</script>

<template>
  <div class="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">AppsGoLocal DB Studio</h1>
        <span class="text-sm text-gray-500 dark:text-gray-400">Visual database schema builder</span>
      </div>
    </header>

    <!-- Toolbar -->
    <Toolbar :chat-open="showChat" @toggle-chat="showChat = !showChat" />

    <!-- Canvas -->
    <main class="flex-1 overflow-hidden flex">
      <div class="flex-1 overflow-hidden">
        <SchemaCanvas />
      </div>
      <ChatAside v-if="showChat" @close="showChat = false" />
    </main>

    <!-- Debug Panel -->
    <DebugPanel />
  </div>
</template>
