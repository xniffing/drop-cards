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
      class="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
    >
      <div class="text-center flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No tables yet</h3>
        <p class="text-gray-500">Click "Add Table" to get started</p>
      </div>
    </div>
  </div>
</template>
