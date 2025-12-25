<script setup lang="ts">
import { inject } from 'vue'

const addTable = inject('addTable') as () => void
</script>

<template>
  <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
    <button
      @click="addTable"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Table
    </button>

    <div class="ml-auto flex items-center gap-2 text-sm text-gray-600">
      <span>Drag tables to position • Click to edit • Drag from ports to create relations</span>
    </div>
  </div>
</template>
