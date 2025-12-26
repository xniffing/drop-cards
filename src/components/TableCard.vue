<script setup lang="ts">
import { ref, inject } from 'vue'
import { useSchema } from '../composables/useSchema'
import type { Table, Column } from '../types/schema'
import type { Ref } from 'vue'

const props = defineProps<{
  table: Table
}>()

const { updateTable, saveTablePosition, deleteTable, addColumn, updateColumn, saveColumnChanges, deleteColumn, startDrag, endDrag, updateDragPreview, isDragging: isRelationDragging, dragSource, hoveredColumn, setHoveredColumn, relations } = useSchema()

// Get zoom and panOffset from parent canvas
const zoom = inject<Ref<number>>('canvasZoom', ref(1))
const panOffset = inject<Ref<{ x: number; y: number }>>('canvasPanOffset', ref({ x: 0, y: 0 }))

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
  if ((e.target as HTMLElement).closest('.no-drag')) return
  if ((e.target as HTMLElement).closest('.resize-handle')) return
  if ((e.target as HTMLElement).closest('.column-drop-zone')) return

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
  resizeStartWidth.value = props.table.width || 280

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
  if (isHoveredColumn(columnId)) {
    return {
      borderColor: '#10b981',
      backgroundColor: '#f0fdf4',
      borderWidth: '2px',
      borderStyle: 'solid'
    }
  }
  if (isDragOverColumn(columnId)) {
    return {
      borderColor: '#a855f7',
      backgroundColor: '#faf5ff',
      borderWidth: '2px',
      borderStyle: 'solid'
    }
  }
  if (isColumnConnected(columnId)) {
    return {
      borderColor: getColumnRelationColor(columnId) || 'transparent',
      backgroundColor: 'transparent',
      borderWidth: '2px',
      borderStyle: 'solid'
    }
  }
  return {}
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
</script>

<template>
  <div
    class="absolute bg-white rounded-lg shadow-lg border-2 border-gray-300 cursor-move select-none hover:shadow-xl transition-shadow overflow-hidden"
    :style="{
      left: `${table.position.x}px`,
      top: `${table.position.y}px`,
      width: `${table.width || 280}px`
    }"
    :class="{ 'opacity-80': isTableDragging || isResizing }"
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
        <div class="grid grid-cols-[32px_1fr_100px_32px] gap-2 px-1 mb-1">
          <div></div>
          <label :for="`column-name-${column.id}`" class="text-xs text-gray-500">Name</label>
          <label :for="`column-type-${column.id}`" class="text-xs text-gray-500">Type</label>
          <div></div>
        </div>
        
        <!-- Inputs row -->
        <div
          class="grid grid-cols-[32px_1fr_100px_32px] gap-2 items-center py-2 px-1 hover:bg-gray-50 rounded transition-colors column-drop-zone"
          :class="{
            'border-2': isColumnConnected(column.id) || isDragOverColumn(column.id) || isHoveredColumn(column.id)
          }"
          :style="getColumnStyle(column.id)"
          :draggable="true"
          @dragstart="(e) => handleColumnDragStart(e, column.id)"
          @dragend="handleColumnDragEnd"
          @dragover="(e) => handleColumnDragOver(e, column.id)"
          @dragleave="handleColumnDragLeave"
          @drop="(e) => handleColumnDrop(e, column.id)"
          :data-table-id="table.id"
          :data-column-id="column.id"
        >
          <!-- Icon column -->
          <div class="flex items-center justify-center">
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
            class="w-full px-2 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-8"
            placeholder="column_name"
          />
          
          <!-- Type select -->
          <select
            :id="`column-type-${column.id}`"
            :value="column.type"
            @change="(e) => handleUpdateColumnType(column.id, e)"
            class="w-full px-2 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-8"
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
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
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
        class="no-drag w-full mt-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1.5 border border-dashed border-gray-300 hover:border-blue-400"
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
            <div class="w-1 h-1 bg-gray-400 group-hover:bg-blue-600 rounded-full"></div>
          </div>
          <div class="flex gap-0.5">
            <div class="w-1 h-1 bg-gray-400 group-hover:bg-blue-600 rounded-full"></div>
            <div class="w-1 h-1 bg-gray-400 group-hover:bg-blue-600 rounded-full"></div>
          </div>
          <div class="flex gap-0.5">
            <div class="w-1 h-1 bg-gray-400 group-hover:bg-blue-600 rounded-full"></div>
            <div class="w-1 h-1 bg-gray-400 group-hover:bg-blue-600 rounded-full"></div>
            <div class="w-1 h-1 bg-gray-400 group-hover:bg-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
