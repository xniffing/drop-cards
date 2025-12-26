<script setup lang="ts">
import { ref, provide, computed } from 'vue'
import { useSchema } from '../composables/useSchema'
import TableCard from './TableCard.vue'
import RelationLine from './RelationLine.vue'
import RelationTypeModal from './RelationTypeModal.vue'
import RelationEditor from './RelationEditor.vue'
import ColumnConfigModal from './ColumnConfigModal.vue'
import type { Relation, Column } from '../types/schema'

const { tables, relations, isDragging, dragSource, dragPreview, addRelation, validateRelation, selectedRelationId, deselectRelation, updateDragPreview, updateColumn, saveColumnChanges, selectedTableIds, selectTables, clearSelection, updateTable } = useSchema()

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

// Column configuration modal
const selectedColumn = ref<Column | null>(null)
const selectedTableId = ref<string | null>(null)
const showColumnModal = computed(() => selectedColumn.value !== null && selectedTableId.value !== null)

const canvasRef = ref<HTMLElement | null>(null)
const isPanning = ref(false)
const isSelecting = ref(false)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const selectionEnd = ref<{ x: number; y: number } | null>(null)
const panStart = ref({ x: 0, y: 0 })
const panOffset = ref({ x: 0, y: 0 })
const zoom = ref(1)
const minZoom = 0.25
const maxZoom = 3
const isMultiDragging = ref(false)
const multiDragStart = ref<{ x: number; y: number } | null>(null)
const multiDragOffsets = ref<Map<string, { x: number; y: number }>>(new Map())
const mouseDownPos = ref<{ x: number; y: number } | null>(null)
const dragThreshold = 5 // pixels - minimum movement to consider it a drag
const hasMoved = ref(false)

// Provide zoom and panOffset for child components
provide('canvasZoom', zoom)
provide('canvasPanOffset', panOffset)

// Provide selected column info for highlighting
const selectedColumnInfo = computed(() => {
  if (!selectedColumn.value || !selectedTableId.value) return null
  return { tableId: selectedTableId.value, columnId: selectedColumn.value.id }
})
provide('selectedColumn', selectedColumnInfo)

const handleMouseDown = (e: MouseEvent) => {
  // Only pan with middle mouse button (button 1)
  if (e.button === 1) {
    e.preventDefault()
    e.stopPropagation()
    isPanning.value = true
    panStart.value = { x: e.clientX - panOffset.value.x, y: e.clientY - panOffset.value.y }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return
  }
  
  // Left click - handle selection box and multi-drag
  if (e.button === 0) {
    const target = e.target as HTMLElement
    // Check if click is on canvas background, empty transformed container, or bubbled from a table
    const isCanvasClick = target === canvasRef.value
    const isTableClick = target.closest('[data-table-id]')
    const isTransformedContainer = target.classList.contains('origin-top-left')
    const isSVG = target.tagName === 'svg' || target.closest('svg')
    const isRelationPath = target.tagName === 'path' && target.closest('svg')
    
    // Allow clicks on canvas, empty transformed container, or tables
    // But not on SVG elements (relations) unless it's a relation path
    if (!isCanvasClick && !isTableClick && !isTransformedContainer && !isRelationPath) {
      // If clicking on SVG background (not a path), allow it
      if (!isSVG) return
    }
    
    deselectRelation()
    
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect) return
    
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldX = (screenX - panOffset.value.x) / zoom.value
    const worldY = (screenY - panOffset.value.y) / zoom.value
    
    // Store initial mouse position to detect drag vs click
    mouseDownPos.value = { x: screenX, y: screenY }
    hasMoved.value = false
    
    // Check if clicking on a table
    const clickedTable = tables.value.find(table => {
      const tableWidth = table.width || 280
      return worldX >= table.position.x &&
             worldX <= table.position.x + tableWidth &&
             worldY >= table.position.y &&
             worldY <= table.position.y + 200 // Approximate table height
    })
    
    // If we have selected tables and clicking on one of them, prepare for multi-drag
    if (clickedTable && selectedTableIds.value.size > 0 && selectedTableIds.value.has(clickedTable.id)) {
      // Prepare for potential multi-drag (will start if mouse moves)
      isMultiDragging.value = false // Will be set to true on first move
      multiDragStart.value = { x: worldX, y: worldY }
      
      // Store initial positions for each selected table
      multiDragOffsets.value.clear()
      selectedTableIds.value.forEach(tableId => {
        const table = tables.value.find(t => t.id === tableId)
        if (table) {
          multiDragOffsets.value.set(tableId, {
            x: table.position.x,
            y: table.position.y
          })
        }
      })
    } else if (!clickedTable) {
      // Start selection box on empty space (canvas background or empty transformed container)
      // Prepare for potential selection box (will start if mouse moves)
      isSelecting.value = false // Will be set to true on first move
      selectionStart.value = { x: worldX, y: worldY }
      selectionEnd.value = { x: worldX, y: worldY }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

const handleMouseMove = (e: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top
  const worldX = (screenX - panOffset.value.x) / zoom.value
  const worldY = (screenY - panOffset.value.y) / zoom.value
  
  // Check if mouse has moved significantly (drag vs click)
  if (mouseDownPos.value && !hasMoved.value) {
    const dx = Math.abs(screenX - mouseDownPos.value.x)
    const dy = Math.abs(screenY - mouseDownPos.value.y)
    if (dx > dragThreshold || dy > dragThreshold) {
      hasMoved.value = true
      
      // Start the appropriate action based on what was clicked
      if (multiDragStart.value && selectedTableIds.value.size > 0) {
        // Start multi-drag
        isMultiDragging.value = true
      } else if (selectionStart.value) {
        // Start selection box
        isSelecting.value = true
        // Clear selection if not holding shift/ctrl/cmd
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          clearSelection()
        }
      }
    }
  }
  
  if (isPanning.value) {
    e.preventDefault()
    panOffset.value = {
      x: e.clientX - panStart.value.x,
      y: e.clientY - panStart.value.y
    }
  } else if (isMultiDragging.value && multiDragStart.value && multiDragOffsets.value.size > 0) {
    // Move all selected tables relative to their initial positions
    const deltaX = worldX - multiDragStart.value.x
    const deltaY = worldY - multiDragStart.value.y
    
    selectedTableIds.value.forEach(tableId => {
      const initialPos = multiDragOffsets.value.get(tableId)
      if (initialPos) {
        updateTable(tableId, {
          position: {
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY
          }
        })
      }
    })
  } else if (isSelecting.value && selectionStart.value) {
    // Update selection box
    selectionEnd.value = { x: worldX, y: worldY }
    
    // Find tables in selection box
    const minX = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const maxX = Math.max(selectionStart.value.x, selectionEnd.value.x)
    const minY = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const maxY = Math.max(selectionStart.value.y, selectionEnd.value.y)
    
    const selectedIds: string[] = []
    tables.value.forEach(table => {
      const tableWidth = table.width || 280
      const tableHeight = 200 // Approximate
      const tableRight = table.position.x + tableWidth
      const tableBottom = table.position.y + tableHeight
      
      // Check if table overlaps with selection box
      if (table.position.x < maxX &&
          tableRight > minX &&
          table.position.y < maxY &&
          tableBottom > minY) {
        selectedIds.push(table.id)
      }
    })
    
    selectTables(selectedIds)
  }
  
  // Update drag preview position
  if (isDragging.value && dragSource.value) {
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const worldPos = {
      x: (mouseX - panOffset.value.x) / zoom.value,
      y: (mouseY - panOffset.value.y) / zoom.value
    }
    updateDragPreview(worldPos)
  }
}

const handleMouseUp = () => {
  // Handle click (no significant movement) - clear selection
  if (!hasMoved.value && mouseDownPos.value && !isPanning.value) {
    // Only clear if clicking on empty canvas (not on a table)
    if (!isMultiDragging.value && !isSelecting.value) {
      clearSelection()
    }
  }
  
  if (isPanning.value || isSelecting.value || isMultiDragging.value) {
    if (isMultiDragging.value) {
      // Save positions to history
      selectedTableIds.value.forEach(tableId => {
        const table = tables.value.find(t => t.id === tableId)
        if (table) {
          // Trigger history save for each table
          updateTable(tableId, { position: table.position })
        }
      })
    }
    
    isPanning.value = false
    isSelecting.value = false
    isMultiDragging.value = false
    selectionStart.value = null
    selectionEnd.value = null
    multiDragStart.value = null
    multiDragOffsets.value.clear()
  }
  
  // Reset state
  mouseDownPos.value = null
  hasMoved.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
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

const handleColumnConfig = (e: CustomEvent) => {
  const { tableId, columnId } = e.detail
  const table = tables.value.find(t => t.id === tableId)
  if (!table) return
  
  const column = table.columns.find(c => c.id === columnId)
  if (!column) return
  
  selectedTableId.value = tableId
  selectedColumn.value = column
}

const handleColumnConfigConfirm = (updates: Partial<Column>) => {
  if (!selectedColumn.value || !selectedTableId.value) return
  
  updateColumn(selectedTableId.value, selectedColumn.value.id, updates)
  saveColumnChanges()
  
  selectedColumn.value = null
  selectedTableId.value = null
}

const handleColumnConfigCancel = () => {
  selectedColumn.value = null
  selectedTableId.value = null
}

const getSelectedTableName = computed(() => {
  if (!selectedTableId.value) return ''
  const table = tables.value.find(t => t.id === selectedTableId.value)
  return table?.name || ''
})

// Calculate relation midpoint for positioning RelationEditor
const getRelationPosition = computed(() => {
  if (!selectedRelation.value) return null
  
  const relation = selectedRelation.value
  const fromTable = tables.value.find(t => t.id === relation.fromTableId)
  const toTable = tables.value.find(t => t.id === relation.toTableId)
  
  if (!fromTable || !toTable) return null
  
  const fromTablePos = fromTable.position
  const toTablePos = toTable.position
  const fromTableWidth = fromTable.width || 280
  
  const fromColumnIndex = fromTable.columns.findIndex(c => c.id === relation.fromColumnId)
  const toColumnIndex = toTable.columns.findIndex(c => c.id === relation.toColumnId)
  
  const headerHeight = 68
  const padding = 12
  const labelsRowHeight = 20
  const inputsRowHeight = 48
  const columnGroupHeight = labelsRowHeight + inputsRowHeight
  
  const fromY = fromTablePos.y + headerHeight + padding + 
    (fromColumnIndex * columnGroupHeight) + labelsRowHeight + (inputsRowHeight / 2) + 10
  const toY = toTablePos.y + headerHeight + padding + 
    (toColumnIndex * columnGroupHeight) + labelsRowHeight + (inputsRowHeight / 2) + 10
  
  const fromX = fromTablePos.x + fromTableWidth
  const toX = toTablePos.x
  
  // Calculate midpoint of the line (approximate for bezier curve)
  // Convert world coordinates to screen coordinates since RelationEditor is outside transformed container
  const midX = (fromX + toX) / 2
  const midY = (fromY + toY) / 2
  
  // Transform world coordinates to screen coordinates
  const screenX = midX * zoom.value + panOffset.value.x
  const screenY = midY * zoom.value + panOffset.value.y
  
  return { x: screenX, y: screenY }
})

const selectionBox = computed(() => {
  if (!isSelecting.value || !selectionStart.value || !selectionEnd.value) return null
  
  const minX = Math.min(selectionStart.value.x, selectionEnd.value.x)
  const maxX = Math.max(selectionStart.value.x, selectionEnd.value.x)
  const minY = Math.min(selectionStart.value.y, selectionEnd.value.y)
  const maxY = Math.max(selectionStart.value.y, selectionEnd.value.y)
  
  // Convert to screen coordinates
  const screenMinX = minX * zoom.value + panOffset.value.x
  const screenMaxX = maxX * zoom.value + panOffset.value.x
  const screenMinY = minY * zoom.value + panOffset.value.y
  const screenMaxY = maxY * zoom.value + panOffset.value.y
  
  return {
    x: screenMinX,
    y: screenMinY,
    width: screenMaxX - screenMinX,
    height: screenMaxY - screenMinY
  }
})

const getDragPreviewPath = computed(() => {
  if (!isDragging.value || !dragSource.value || !dragPreview.value) return ''
  
  const sourceTable = tables.value.find(t => t.id === dragSource.value!.tableId)
  if (!sourceTable) return ''
  
  const sourceColumn = sourceTable.columns.find(c => c.id === dragSource.value!.columnId)
  if (!sourceColumn) return ''
  
  const tableWidth = sourceTable.width || 280
  // Use the same calculation as RelationLine for accurate alignment
  const headerHeight = 68
  const padding = 12
  const labelsRowHeight = 20
  const inputsRowHeight = 48
  const columnGroupHeight = labelsRowHeight + inputsRowHeight // 68px per column
  const columnIndex = sourceTable.columns.findIndex(c => c.id === dragSource.value!.columnId)
  
  // Calculate source column position (right edge of table) - matching RelationLine calculation
  const sourceX = sourceTable.position.x + tableWidth
  const sourceY = sourceTable.position.y + headerHeight + padding + 
    (columnIndex * columnGroupHeight) + labelsRowHeight + (inputsRowHeight / 2) + 10
  
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
    class="w-full h-full relative bg-gray-50 dark:bg-gray-900 overflow-hidden"
    :class="{
      'cursor-default': !isSelecting && !isPanning,
      'cursor-crosshair': isSelecting,
      'cursor-grab active:cursor-grabbing': isPanning
    }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel.prevent="handleWheel"
    @contextmenu.prevent
    @relation-drop="handleRelationDrop"
    @column-config="handleColumnConfig"
  >
    <!-- Grid pattern -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <pattern id="grid-light" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#d1d5db" />
        </pattern>
        <pattern id="grid-dark" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#374151" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-light)" class="dark:hidden" />
      <rect width="100%" height="100%" fill="url(#grid-dark)" class="hidden dark:block" />
    </svg>

    <!-- Canvas content -->
    <div
      class="absolute inset-0 origin-top-left pointer-events-none"
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

    <!-- Selection Box -->
    <div
      v-if="selectionBox"
      class="absolute border-2 border-blue-500 pointer-events-none z-30"
      :style="{
        left: `${selectionBox.x}px`,
        top: `${selectionBox.y}px`,
        width: `${selectionBox.width}px`,
        height: `${selectionBox.height}px`,
        backgroundColor: 'rgba(59, 130, 246, 0.15)'
      }"
    ></div>

    <!-- Empty state -->
    <div
      v-if="tables.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
    >
      <div class="text-center flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tables yet</h3>
        <p class="text-gray-500 dark:text-gray-400">Click "Add Table" to get started</p>
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
      v-if="selectedRelation && getRelationPosition"
      :relation="selectedRelation"
      :position="getRelationPosition"
    />

    <!-- Column Configuration Panel -->
    <ColumnConfigModal
      v-if="selectedColumn"
      :column="selectedColumn"
      :table-id="selectedTableId"
      :table-name="getSelectedTableName"
      :open="showColumnModal"
      @confirm="handleColumnConfigConfirm"
      @cancel="handleColumnConfigCancel"
    />
  </div>
</template>
