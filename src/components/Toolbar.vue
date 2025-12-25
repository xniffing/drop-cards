<script setup lang="ts">
import { inject } from 'vue'

const addTable = inject('addTable') as () => void
</script>

<template>
  <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
    <button
      @click="addTable"
      class="px-2.5 py-1.5 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span>Add Table</span>
    </button>

    <div class="ml-auto flex items-center gap-2 text-sm text-gray-600">
      <span>Drag tables to position • Click to edit • Drag from ports to create relations</span>
    </div>
  </div>
</template>
