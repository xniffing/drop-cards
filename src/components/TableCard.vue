<script setup lang="ts">
import { ref, inject } from 'vue'
import { useSchema } from '../composables/useSchema'
import type { Table, Column } from '../types/schema'
import type { Ref } from 'vue'

const props = defineProps<{
  table: Table
}>()

const { updateTable, saveTablePosition, deleteTable, addColumn, updateColumn, saveColumnChanges, deleteColumn, startDrag, endDrag, updateDragPreview, isDragging: isRelationDragging, dragSource, hoveredColumn, setHoveredColumn, relations, selectedTableIds } = useSchema()

// Get zoom and panOffset from parent canvas
const zoom = inject<Ref<number>>('canvasZoom', ref(1))
const panOffset = inject<Ref<{ x: number; y: number }>>('canvasPanOffset', ref({ x: 0, y: 0 }))
const selectedColumn = inject<Ref<{ tableId: string | null; columnId: string } | null>>('selectedColumn', ref(null))

// Convert screen coordinates to world coordinates
const screenToWorld = (screenX: number, screenY: number) => {
  return {
    x: (screenX - panOffset.value.x) / zoom.value,
    y: (screenY - panOffset.value.y) / zoom.value
  }
}

const isTableDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const isResizing = ref(false)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)

const handleMouseDown = (e: MouseEvent) => {
  // Never let interactive controls start a canvas/table drag-selection.
  // This is especially important for column inputs inside `.column-drop-zone`.
  if ((e.target as HTMLElement).closest('input, textarea, select, button, [contenteditable="true"]')) {
    e.stopPropagation()
    return
  }

  // Stop propagation for no-drag elements (inputs, buttons, etc.) to prevent canvas drag selection
  if ((e.target as HTMLElement).closest('.no-drag')) {
    e.stopPropagation()
    return
  }
  if ((e.target as HTMLElement).closest('.resize-handle')) return
  if ((e.target as HTMLElement).closest('.column-drop-zone')) return

  // If table is selected and part of multi-select, let canvas handle multi-drag
  if (selectedTableIds.value.has(props.table.id) && selectedTableIds.value.size > 1) {
    // Don't stop propagation - let canvas handle multi-drag
    return
  }
  
  // Single table drag - stop propagation to prevent canvas selection
  e.stopPropagation()
  
  isTableDragging.value = true
  
  // Convert screen coordinates to world coordinates
  const worldPos = screenToWorld(e.clientX, e.clientY)
  dragOffset.value = {
    x: worldPos.x - props.table.position.x,
    y: worldPos.y - props.table.position.y
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleResizeStart = (e: MouseEvent) => {
  e.stopPropagation()
  isResizing.value = true
  resizeStartX.value = e.clientX
  resizeStartWidth.value = props.table.width || 350

  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

const handleResizeMove = (e: MouseEvent) => {
  if (!isResizing.value) return

  // Account for zoom when resizing
  const deltaX = (e.clientX - resizeStartX.value) / zoom.value
  const newWidth = Math.max(200, Math.min(600, resizeStartWidth.value + deltaX))
  
  updateTable(props.table.id, { width: newWidth })
}

const handleResizeEnd = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

const handleMouseMove = (e: MouseEvent) => {
  if (isTableDragging.value) {
    // Convert screen coordinates to world coordinates
    const worldPos = screenToWorld(e.clientX, e.clientY)
    updateTable(props.table.id, {
      position: {
        x: worldPos.x - dragOffset.value.x,
        y: worldPos.y - dragOffset.value.y
      }
    })
  }
}

const handleMouseUp = () => {
  if (isTableDragging.value) {
    // Save position to history when drag ends
    saveTablePosition(props.table.id, props.table.position)
  }
  isTableDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

const handleAddColumn = () => {
  addColumn(props.table.id)
}

const handleDeleteTable = () => {
  if (confirm(`Delete table "${props.table.name}"?`)) {
    deleteTable(props.table.id)
  }
}

const handleUpdateTableName = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  updateTable(props.table.id, { name: value })
}

let columnUpdateTimeout: ReturnType<typeof setTimeout> | null = null

const handleUpdateColumnName = (columnId: string, e: Event) => {
  const value = (e.target as HTMLInputElement).value
  updateColumn(props.table.id, columnId, { name: value })
  // Debounce history save for text inputs
  if (columnUpdateTimeout) clearTimeout(columnUpdateTimeout)
  columnUpdateTimeout = setTimeout(() => {
    saveColumnChanges()
  }, 500)
}

const handleColumnNameBlur = () => {
  if (columnUpdateTimeout) {
    clearTimeout(columnUpdateTimeout)
    columnUpdateTimeout = null
    saveColumnChanges()
  }
}

const handleUpdateColumnType = (columnId: string, e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  updateColumn(props.table.id, columnId, { type: value })
  // Save immediately for select changes
  saveColumnChanges()
}

const handleDeleteColumn = (columnId: string) => {
  if (props.table.columns.length <= 1) {
    alert('Cannot delete the last column')
    return
  }
  deleteColumn(props.table.id, columnId)
}

const getColumnIcon = (column: Column) => {
  if (column.primaryKey) return '🔑'
  if (column.unique) return '⭐'
  return ''
}

const handleColumnDragStart = (e: DragEvent, columnId: string) => {
  e.stopPropagation()
  if (!e.dataTransfer) return
  
  // Mark as dragging to prevent click handler
  isColumnDragging.value = true
  columnMouseDownPos.value = null
  
  startDrag(props.table.id, columnId)
  e.dataTransfer.effectAllowed = 'link'
  e.dataTransfer.setData('text/plain', `${props.table.id}:${columnId}`)
  
  // Set a custom drag image (optional, can be improved)
  const dragImage = document.createElement('div')
  dragImage.style.position = 'absolute'
  dragImage.style.top = '-1000px'
  dragImage.textContent = 'Creating relation...'
  document.body.appendChild(dragImage)
  e.dataTransfer.setDragImage(dragImage, 0, 0)
  setTimeout(() => document.body.removeChild(dragImage), 0)
}

const handleColumnDragEnd = () => {
  endDrag()
  updateDragPreview(null)
  // Reset drag state after a short delay to prevent click from firing
  setTimeout(() => {
    isColumnDragging.value = false
    columnMouseDownPos.value = null
  }, 100)
}

const handleColumnDragOver = (e: DragEvent, columnId: string) => {
  if (!isRelationDragging.value || !dragSource.value) return
  // Prevent dropping on the same column
  if (dragSource.value.tableId === props.table.id && dragSource.value.columnId === columnId) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'none'
    setHoveredColumn(null, null)
    return
  }
  // Prevent dropping within the same table
  if (dragSource.value.tableId === props.table.id) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'none'
    setHoveredColumn(null, null)
    return
  }
  
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer!.dropEffect = 'link'
  
  // Set hovered column
  setHoveredColumn(props.table.id, columnId)
  
  // Update drag preview position - calculate accurate position matching RelationLine
  const columnIndex = props.table.columns.findIndex(c => c.id === columnId)
  const headerHeight = 68
  const padding = 12
  const labelsRowHeight = 20
  const inputsRowHeight = 48
  const columnGroupHeight = labelsRowHeight + inputsRowHeight
  
  // Calculate target column Y position (left edge, center of inputs row)
  const targetY = props.table.position.y + headerHeight + padding + 
    (columnIndex * columnGroupHeight) + labelsRowHeight + (inputsRowHeight / 2) + 10
  const targetX = props.table.position.x // left edge of table
  
  updateDragPreview({ x: targetX, y: targetY })
}

const handleColumnDragLeave = (e: DragEvent) => {
  // Only clear hover if we're actually leaving the column element, not just moving to a child
  const relatedTarget = e.relatedTarget as HTMLElement
  const currentTarget = e.currentTarget as HTMLElement
  if (relatedTarget && currentTarget.contains(relatedTarget)) {
    return // Still within the column element
  }
  setHoveredColumn(null, null)
  updateDragPreview(null)
}

const handleColumnDrop = (e: DragEvent, columnId: string) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (!isRelationDragging.value || !dragSource.value) return
  
  const source = dragSource.value
  const target = { tableId: props.table.id, columnId }
  
  // Prevent relations within the same table
  if (source.tableId === target.tableId) {
    setHoveredColumn(null, null)
    endDrag()
    return
  }
  
  // Prevent self-relation (same column) - redundant but kept for clarity
  if (source.tableId === target.tableId && source.columnId === target.columnId) {
    setHoveredColumn(null, null)
    endDrag()
    return
  }
  
  // Emit event to parent to show relation type modal
  const event = new CustomEvent('relation-drop', {
    detail: {
      fromTableId: source.tableId,
      fromColumnId: source.columnId,
      toTableId: target.tableId,
      toColumnId: target.columnId
    },
    bubbles: true
  })
  e.currentTarget?.dispatchEvent(event)
  
  setHoveredColumn(null, null)
  endDrag()
}

const isDragOverColumn = (columnId: string) => {
  // Only show purple highlight if it's a valid drop target (different table)
  return isRelationDragging.value && dragSource.value !== null &&
    dragSource.value.tableId !== props.table.id && 
    dragSource.value.columnId !== columnId
}

const isHoveredColumn = (columnId: string) => {
  if (!hoveredColumn.value) return false
  return hoveredColumn.value.tableId === props.table.id &&
    hoveredColumn.value.columnId === columnId
}

const getColumnStyle = (columnId: string) => {
  const style: Record<string, string> = {}
  
  // Check if dark mode is active
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  
  // Handle hover state (highest priority for interaction)
  if (isHoveredColumn(columnId)) {
    style.borderColor = '#10b981'
    style.backgroundColor = isDark ? '#064e3b' : '#f0fdf4' // dark: green-900, light: green-50
    style.borderWidth = '2px'
    style.borderStyle = 'solid'
  } else if (isDragOverColumn(columnId)) {
    style.borderColor = '#a855f7'
    style.backgroundColor = isDark ? '#581c87' : '#faf5ff' // dark: purple-900, light: purple-50
    style.borderWidth = '2px'
    style.borderStyle = 'solid'
  } else if (isColumnConnected(columnId)) {
    // Keep relation border - this takes priority over selected state for border color
    style.borderColor = getColumnRelationColor(columnId) || 'transparent'
    style.backgroundColor = 'transparent'
    style.borderWidth = '2px'
    style.borderStyle = 'solid'
  } else if (isSelectedColumn(columnId)) {
    // If selected but no relation, show blue border
    style.borderColor = '#3b82f6'
    style.backgroundColor = 'transparent'
    style.borderWidth = '2px'
    style.borderStyle = 'solid'
  }
  
  // Add offset outline for selected column (using box-shadow for offset effect)
  // This works on top of any existing border
  if (isSelectedColumn(columnId)) {
    style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.5)'
  }
  
  return style
}

const getColumnRelationColor = (columnId: string): string | null => {
  // Find relations connected to this column
  const relation = relations.value.find(
    r => (r.fromTableId === props.table.id && r.fromColumnId === columnId) ||
         (r.toTableId === props.table.id && r.toColumnId === columnId)
  )
  
  if (!relation) return null
  
  // Return color based on relation type
  switch (relation.type) {
    case 'one-to-one':
      return '#3b82f6' // blue
    case 'one-to-many':
      return '#10b981' // green
    case 'many-to-many':
      return '#f59e0b' // amber
    default:
      return '#6b7280' // gray
  }
}

const isColumnConnected = (columnId: string) => {
  return relations.value.some(
    r => (r.fromTableId === props.table.id && r.fromColumnId === columnId) ||
         (r.toTableId === props.table.id && r.toColumnId === columnId)
  )
}

const isSelectedColumn = (columnId: string) => {
  if (!selectedColumn.value) return false
  return selectedColumn.value.tableId === props.table.id &&
         selectedColumn.value.columnId === columnId
}

// Column drag detection
const isColumnDragging = ref(false)
const columnMouseDownPos = ref<{ x: number; y: number } | null>(null)
const columnClickThreshold = 5 // pixels
const tableCardRef = ref<HTMLElement | null>(null)

const handleColumnMouseDown = (e: MouseEvent) => {
  // Don't track if clicking on inputs, buttons, or during relation drag
  if ((e.target as HTMLElement).closest('.drag-handle')) return
  if ((e.target as HTMLElement).closest('input')) return
  if ((e.target as HTMLElement).closest('select')) return
  if ((e.target as HTMLElement).closest('button')) return
  if (isRelationDragging.value) return
  
  columnMouseDownPos.value = { x: e.clientX, y: e.clientY }
  isColumnDragging.value = false
  
  // Add document-level mousemove listener to detect drag
  const handleMove = (moveEvent: MouseEvent) => {
    if (columnMouseDownPos.value) {
      const dx = Math.abs(moveEvent.clientX - columnMouseDownPos.value.x)
      const dy = Math.abs(moveEvent.clientY - columnMouseDownPos.value.y)
      if (dx > columnClickThreshold || dy > columnClickThreshold) {
        isColumnDragging.value = true
      }
    }
  }
  
  const handleUp = () => {
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
  }
  
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleUp)
}

const handleColumnClick = (e: MouseEvent, column: Column) => {
  // Don't open modal if clicking on inputs, buttons, or if it was a drag
  if ((e.target as HTMLElement).closest('.drag-handle')) return
  if ((e.target as HTMLElement).closest('input')) return
  if ((e.target as HTMLElement).closest('select')) return
  if ((e.target as HTMLElement).closest('button')) return
  if (isRelationDragging.value) return
  if (isColumnDragging.value) {
    isColumnDragging.value = false
    columnMouseDownPos.value = null
    return
  }
  
  // Emit event to parent to show column config modal
  const event = new CustomEvent('column-config', {
    detail: {
      tableId: props.table.id,
      columnId: column.id
    },
    bubbles: true
  })
  // Dispatch from table card root to ensure it bubbles to canvas
  if (tableCardRef.value) {
    tableCardRef.value.dispatchEvent(event)
  } else {
    // Fallback to current target if ref not available
    e.currentTarget?.dispatchEvent(event)
  }
  
  columnMouseDownPos.value = null
}
</script>

<template>
  <div
    ref="tableCardRef"
    :data-table-id="table.id"
    class="absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 cursor-move select-none hover:shadow-xl transition-shadow overflow-hidden pointer-events-auto"
    :class="{
      'opacity-80': isTableDragging || isResizing,
      'border-blue-500 dark:border-blue-400 ring-2 ring-blue-300 dark:ring-blue-600': selectedTableIds.has(table.id),
      'border-gray-300 dark:border-gray-600': !selectedTableIds.has(table.id)
    }"
    :style="{
      left: `${table.position.x}px`,
      top: `${table.position.y}px`,
      width: `${table.width || 350}px`
    }"
    @mousedown="handleMouseDown"
  >
    <!-- Table header -->
    <div class="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between gap-2 min-w-0">
      <div class="flex-1 min-w-0">
        <label for="table-name" class="block text-xs text-blue-200 mb-1">Table Name</label>
        <input
          id="table-name"
          v-model="table.name"
          @input="handleUpdateTableName"
          @mousedown.stop
          class="no-drag bg-transparent border-none outline-none font-semibold text-lg w-full text-white placeholder-blue-200"
          placeholder="table_name"
        />
      </div>
      <button
        @click.stop="handleDeleteTable"
        class="no-drag ml-2 p-1.5 hover:bg-blue-700 rounded transition-colors shrink-0 cursor-pointer"
        title="Delete table"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>

    <!-- Columns -->
    <div class="p-3">
      <div
        v-for="column in table.columns"
        :key="column.id"
        class="no-drag group"
      >
        <!-- Labels row -->
        <div class="grid grid-cols-[44px_1fr_100px_32px] gap-2 px-1 mb-1">
          <div></div>
          <label :for="`column-name-${column.id}`" class="text-xs text-gray-500 dark:text-gray-400">Name</label>
          <label :for="`column-type-${column.id}`" class="text-xs text-gray-500 dark:text-gray-400">Type</label>
          <div></div>
        </div>
        
        <!-- Inputs row -->
        <div
          class="grid grid-cols-[44px_1fr_100px_32px] gap-2 items-center py-2 px-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors column-drop-zone cursor-pointer"
          :class="{
            'border-2': isColumnConnected(column.id) || isDragOverColumn(column.id) || isHoveredColumn(column.id) || isSelectedColumn(column.id)
          }"
          :style="getColumnStyle(column.id)"
          @click="(e) => handleColumnClick(e, column)"
          @mousedown="handleColumnMouseDown"
          @dragover="(e) => handleColumnDragOver(e, column.id)"
          @dragleave="handleColumnDragLeave"
          @drop="(e) => handleColumnDrop(e, column.id)"
          :data-table-id="table.id"
          :data-column-id="column.id"
        >
          <!-- Icon column -->
          <div class="flex items-center justify-start gap-1 pl-1">
            <!-- Drag handle (two columns of dots) -->
            <div
              class="drag-handle p-1 rounded cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-600"
              draggable="true"
              title="Drag to create relation"
              @mousedown.stop
              @click.stop
              @dragstart="(e) => handleColumnDragStart(e, column.id)"
              @dragend="handleColumnDragEnd"
            >
              <div class="grid grid-cols-2 gap-[2px]">
                <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
              </div>
            </div>

            <!-- Column icon (PK/Unique) -->
            <span v-if="getColumnIcon(column)" class="text-base" :title="column.primaryKey ? 'Primary Key' : column.unique ? 'Unique' : ''">
              {{ getColumnIcon(column) }}
            </span>
          </div>
          
          <!-- Name input -->
          <input
            :id="`column-name-${column.id}`"
            v-model="column.name"
            @input="(e) => handleUpdateColumnName(column.id, e)"
            @blur="handleColumnNameBlur"
            @mousedown.stop
            class="w-full px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-8"
            placeholder="column_name"
          />
          
          <!-- Type select -->
          <select
            :id="`column-type-${column.id}`"
            :value="column.type"
            @change="(e) => handleUpdateColumnType(column.id, e)"
            @mousedown.stop
            class="w-full px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-8"
          >
            <option value="integer">integer</option>
            <option value="varchar">varchar</option>
            <option value="text">text</option>
            <option value="boolean">boolean</option>
            <option value="timestamp">timestamp</option>
            <option value="date">date</option>
            <option value="json">json</option>
          </select>
          
          <!-- Delete button -->
          <div class="flex items-center justify-center">
            <button
              @click.stop="() => handleDeleteColumn(column.id)"
              class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all opacity-0 group-hover:opacity-100"
              title="Delete column"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Add column button -->
      <button
        @click.stop="handleAddColumn"
        class="no-drag w-full mt-3 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Column
      </button>
    </div>

    <!-- Resize handle -->
    <div
      class="resize-handle absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize group"
      @mousedown.stop="handleResizeStart"
    >
      <div class="absolute bottom-0 right-0 w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity">
        <div class="absolute bottom-0 right-0 flex flex-col items-end gap-0.5">
          <div class="flex gap-0.5">
            <div class="w-1 h-1 bg-gray-400 dark:bg-gray-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-full"></div>
          </div>
          <div class="flex gap-0.5">
            <div class="w-1 h-1 bg-gray-400 dark:bg-gray-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-full"></div>
            <div class="w-1 h-1 bg-gray-400 dark:bg-gray-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-full"></div>
          </div>
          <div class="flex gap-0.5">
            <div class="w-1 h-1 bg-gray-400 dark:bg-gray-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-full"></div>
            <div class="w-1 h-1 bg-gray-400 dark:bg-gray-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-full"></div>
            <div class="w-1 h-1 bg-gray-400 dark:bg-gray-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
