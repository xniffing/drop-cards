<script setup lang="ts">
import { ref, provide, computed } from 'vue'
import { useSchemaProvider } from '../composables/useSchema'
import TableCard from './TableCard.vue'
import RelationLine from './RelationLine.vue'
import type { Relation } from '../types/schema'

const { tables, relations, addRelation } = useSchemaProvider()

const canvasRef = ref<HTMLElement | null>(null)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panOffset = ref({ x: 0, y: 0 })

// Relation dragging state
const isCreatingRelation = ref(false)
const relationDragSource = ref<{ tableId: string; columnId: string; position: { x: number; y: number } } | null>(null)
const relationDragTarget = ref<{ tableId: string; columnId: string; position: { x: number; y: number } } | null>(null)
const relationDragMousePos = ref({ x: 0, y: 0 })
const showRelationTypeDialog = ref(false)
const pendingRelation = ref<Omit<Relation, 'id' | 'type'> | null>(null)

// Provide relation drag state to child components
provide('relationDragState', {
  isCreatingRelation,
  relationDragSource,
  relationDragTarget,
  startRelationDrag: (tableId: string, columnId: string, position: { x: number; y: number }) => {
    isCreatingRelation.value = true
    relationDragSource.value = { tableId, columnId, position }
    relationDragMousePos.value = position
  },
  setRelationTarget: (tableId: string, columnId: string, position: { x: number; y: number }) => {
    relationDragTarget.value = { tableId, columnId, position }
  },
  clearRelationTarget: () => {
    relationDragTarget.value = null
  },
  endRelationDrag: () => {
    if (relationDragSource.value && relationDragTarget.value) {
      // Show dialog to select relation type
      pendingRelation.value = {
        fromTableId: relationDragSource.value.tableId,
        fromColumnId: relationDragSource.value.columnId,
        toTableId: relationDragTarget.value.tableId,
        toColumnId: relationDragTarget.value.columnId
      }
      showRelationTypeDialog.value = true
    }
    isCreatingRelation.value = false
    relationDragSource.value = null
    relationDragTarget.value = null
  },
  cancelRelationDrag: () => {
    isCreatingRelation.value = false
    relationDragSource.value = null
    relationDragTarget.value = null
  }
})

const handleMouseDown = (e: MouseEvent) => {
  if (e.target === canvasRef.value && !isCreatingRelation.value) {
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

  if (isCreatingRelation.value) {
    relationDragMousePos.value = {
      x: e.clientX - panOffset.value.x,
      y: e.clientY - panOffset.value.y
    }
  }
}

const handleMouseUp = () => {
  isPanning.value = false
}

const createRelation = (type: 'one-to-one' | 'one-to-many' | 'many-to-many') => {
  if (pendingRelation.value) {
    addRelation({
      ...pendingRelation.value,
      type
    })
  }
  showRelationTypeDialog.value = false
  pendingRelation.value = null
}

const cancelRelationDialog = () => {
  showRelationTypeDialog.value = false
  pendingRelation.value = null
}

// Compute the temporary relation line position
const tempRelationLine = computed(() => {
  if (!isCreatingRelation.value || !relationDragSource.value) return null

  const target = relationDragTarget.value
    ? relationDragTarget.value.position
    : relationDragMousePos.value

  return {
    from: relationDragSource.value.position,
    to: target,
    isDashed: !relationDragTarget.value
  }
})
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

        <!-- Temporary relation line while dragging -->
        <path
          v-if="tempRelationLine"
          :d="`M ${tempRelationLine.from.x} ${tempRelationLine.from.y} Q ${(tempRelationLine.from.x + tempRelationLine.to.x) / 2} ${tempRelationLine.from.y} ${tempRelationLine.to.x} ${tempRelationLine.to.y}`"
          :stroke="tempRelationLine.isDashed ? '#9ca3af' : '#3b82f6'"
          :stroke-width="tempRelationLine.isDashed ? 2 : 3"
          :stroke-dasharray="tempRelationLine.isDashed ? '5,5' : 'none'"
          fill="none"
          :opacity="tempRelationLine.isDashed ? 0.5 : 0.8"
        />
      </svg>

      <!-- Tables -->
      <TableCard
        v-for="table in tables"
        :key="table.id"
        :table="table"
      />
    </div>

    <!-- Relation Type Selection Dialog -->
    <div
      v-if="showRelationTypeDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="cancelRelationDialog"
    >
      <div
        class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        @click.stop
      >
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Select Relation Type</h3>
        <p class="text-sm text-gray-600 mb-6">Choose the type of relationship between these columns:</p>

        <div class="space-y-3">
          <button
            @click="createRelation('one-to-one')"
            class="w-full px-4 py-3 text-left border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div class="font-semibold text-blue-900 group-hover:text-blue-700">One-to-One</div>
            <div class="text-sm text-gray-600 mt-1">Each record in the first table relates to exactly one record in the second table</div>
          </button>

          <button
            @click="createRelation('one-to-many')"
            class="w-full px-4 py-3 text-left border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div class="font-semibold text-green-900 group-hover:text-green-700">One-to-Many</div>
            <div class="text-sm text-gray-600 mt-1">Each record in the first table can relate to multiple records in the second table</div>
          </button>

          <button
            @click="createRelation('many-to-many')"
            class="w-full px-4 py-3 text-left border-2 border-amber-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all group"
          >
            <div class="font-semibold text-amber-900 group-hover:text-amber-700">Many-to-Many</div>
            <div class="text-sm text-gray-600 mt-1">Multiple records in both tables can relate to each other</div>
          </button>
        </div>

        <button
          @click="cancelRelationDialog"
          class="w-full mt-4 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
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
