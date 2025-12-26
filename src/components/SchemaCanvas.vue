<script setup lang="ts">
import { ref, provide, computed } from 'vue'
import { useSchema } from '../composables/useSchema'
import TableCard from './TableCard.vue'
import RelationLine from './RelationLine.vue'
import RelationTypeModal from './RelationTypeModal.vue'
import RelationEditor from './RelationEditor.vue'
import type { Relation } from '../types/schema'

const { tables, relations, isDragging, dragSource, dragPreview, addRelation, validateRelation, endDrag, selectedRelationId, deselectRelation, updateDragPreview } = useSchema()

const selectedRelation = computed(() => {
  if (!selectedRelationId.value) return null
  return relations.value.find(r => r.id === selectedRelationId.value) || null
})

const pendingRelation = ref<{
  fromTableId: string
  fromColumnId: string
  toTableId: string
  toColumnId: string
} | null>(null)

const showRelationModal = computed(() => pendingRelation.value !== null)

const canvasRef = ref<HTMLElement | null>(null)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panOffset = ref({ x: 0, y: 0 })
const zoom = ref(1)
const minZoom = 0.25
const maxZoom = 3

// Provide zoom and panOffset for child components
provide('canvasZoom', zoom)
provide('canvasPanOffset', panOffset)

const handleMouseDown = (e: MouseEvent) => {
  // Middle mouse button (button 1) - allow from anywhere
  if (e.button === 1) {
    e.preventDefault()
    e.stopPropagation()
    isPanning.value = true
    panStart.value = { x: e.clientX - panOffset.value.x, y: e.clientY - panOffset.value.y }
    // Add global listeners for mouse move and up
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return
  }
  
  // Left click on canvas background - deselect relation
  if (e.target === canvasRef.value) {
    deselectRelation()
    isPanning.value = true
    panStart.value = { x: e.clientX - panOffset.value.x, y: e.clientY - panOffset.value.y }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isPanning.value) {
    e.preventDefault()
    panOffset.value = {
      x: e.clientX - panStart.value.x,
      y: e.clientY - panStart.value.y
    }
  }
  
  // Update drag preview position
  if (isDragging.value && dragSource.value) {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (rect) {
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const worldPos = {
        x: (mouseX - panOffset.value.x) / zoom.value,
        y: (mouseY - panOffset.value.y) / zoom.value
      }
      updateDragPreview(worldPos)
    }
  }
}

const handleMouseUp = (e?: MouseEvent) => {
  if (isPanning.value) {
    isPanning.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}

const handleRelationDrop = (e: CustomEvent) => {
  const { fromTableId, fromColumnId, toTableId, toColumnId } = e.detail
  
  // Validate relation
  const validation = validateRelation(fromTableId, fromColumnId, toTableId, toColumnId)
  if (!validation.valid) {
    alert(validation.error)
    return
  }
  
  pendingRelation.value = { fromTableId, fromColumnId, toTableId, toColumnId }
}

const handleRelationConfirm = (type: Relation['type']) => {
  if (!pendingRelation.value) return
  
  addRelation({
    ...pendingRelation.value,
    type
  })
  
  pendingRelation.value = null
}

const handleRelationCancel = () => {
  pendingRelation.value = null
}

const getDragPreviewPath = computed(() => {
  if (!isDragging.value || !dragSource.value || !dragPreview.value) return ''
  
  const sourceTable = tables.value.find(t => t.id === dragSource.value!.tableId)
  if (!sourceTable) return ''
  
  const sourceColumn = sourceTable.columns.find(c => c.id === dragSource.value!.columnId)
  if (!sourceColumn) return ''
  
  const tableWidth = sourceTable.width || 280
  const headerHeight = 60
  const columnHeight = 50
  const padding = 12
  const columnIndex = sourceTable.columns.findIndex(c => c.id === dragSource.value!.columnId)
  
  // Calculate source column position (right edge of table)
  const sourceX = sourceTable.position.x + tableWidth
  const sourceY = sourceTable.position.y + headerHeight + padding + (columnIndex * columnHeight) + (columnHeight / 2)
  
  return `M ${sourceX} ${sourceY} L ${dragPreview.value.x} ${dragPreview.value.y}`
})

const getFromTableName = computed(() => {
  if (!pendingRelation.value) return ''
  const table = tables.value.find(t => t.id === pendingRelation.value!.fromTableId)
  return table?.name || ''
})

const getFromColumnName = computed(() => {
  if (!pendingRelation.value) return ''
  const table = tables.value.find(t => t.id === pendingRelation.value!.fromTableId)
  if (!table) return ''
  const column = table.columns.find(c => c.id === pendingRelation.value!.fromColumnId)
  return column?.name || ''
})

const getToTableName = computed(() => {
  if (!pendingRelation.value) return ''
  const table = tables.value.find(t => t.id === pendingRelation.value!.toTableId)
  return table?.name || ''
})

const getToColumnName = computed(() => {
  if (!pendingRelation.value) return ''
  const table = tables.value.find(t => t.id === pendingRelation.value!.toTableId)
  if (!table) return ''
  const column = table.columns.find(c => c.id === pendingRelation.value!.toColumnId)
  return column?.name || ''
})

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom.value * delta))
  
  if (newZoom === zoom.value) return
  
  // Get mouse position relative to canvas
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  // Calculate zoom point in canvas coordinates
  const zoomPointX = (mouseX - panOffset.value.x) / zoom.value
  const zoomPointY = (mouseY - panOffset.value.y) / zoom.value
  
  // Update zoom
  zoom.value = newZoom
  
  // Adjust pan to keep zoom point under mouse
  panOffset.value = {
    x: mouseX - zoomPointX * zoom.value,
    y: mouseY - zoomPointY * zoom.value
  }
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
    @wheel.prevent="handleWheel"
    @contextmenu.prevent
    @relation-drop="handleRelationDrop"
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
      class="absolute inset-0 origin-top-left"
      :style="{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`
      }"
    >
      <!-- Relations (drawn behind tables) -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style="will-change: contents;">
        <!-- Drag preview line -->
        <path
          v-if="getDragPreviewPath"
          :d="getDragPreviewPath"
          stroke="#9ca3af"
          stroke-width="2"
          stroke-dasharray="5,5"
          fill="none"
          class="pointer-events-none"
        />
        
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

    <!-- Relation Type Modal -->
    <RelationTypeModal
      v-if="showRelationModal"
      :from-table-name="getFromTableName"
      :from-column-name="getFromColumnName"
      :to-table-name="getToTableName"
      :to-column-name="getToColumnName"
      @confirm="handleRelationConfirm"
      @cancel="handleRelationCancel"
    />

    <!-- Relation Editor -->
    <RelationEditor
      v-if="selectedRelation"
      :relation="selectedRelation"
    />
  </div>
</template>
