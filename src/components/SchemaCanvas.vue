<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSchemaProvider } from '../composables/useSchema'
import TableCard from './TableCard.vue'
import RelationLine from './RelationLine.vue'

const { tables, relations } = useSchemaProvider()

const canvasRef = ref<HTMLElement | null>(null)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panOffset = ref({ x: 0, y: 0 })

const handleMouseDown = (e: MouseEvent) => {
  if (e.target === canvasRef.value) {
    isPanning.value = true
    panStart.value = { x: e.clientX - panOffset.value.x, y: e.clientY - panOffset.value.y }
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isPanning.value) {
    panOffset.value = {
      x: e.clientX - panStart.value.x,
      y: e.clientY - panStart.value.y
    }
  }
}

const handleMouseUp = () => {
  isPanning.value = false
}
</script>

<template>
  <div
    ref="canvasRef"
    class="w-full h-full relative bg-gray-50 overflow-hidden cursor-grab active:cursor-grabbing"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- Grid pattern -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#e5e7eb" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>

    <!-- Canvas content -->
    <div
      class="absolute inset-0"
      :style="{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px)`
      }"
    >
      <!-- Relations (drawn behind tables) -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <RelationLine
          v-for="relation in relations"
          :key="relation.id"
          :relation="relation"
          :tables="tables"
        />
      </svg>

      <!-- Tables -->
      <TableCard
        v-for="table in tables"
        :key="table.id"
        :table="table"
      />
    </div>

    <!-- Empty state -->
    <div
      v-if="tables.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No tables yet</h3>
        <p class="text-gray-500">Click "Add Table" to get started</p>
      </div>
    </div>
  </div>
</template>
