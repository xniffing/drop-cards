<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSchema } from '../composables/useSchema'
import type { Table, Column } from '../types/schema'

const props = defineProps<{
  table: Table
}>()

const { updateTable, deleteTable, addColumn, updateColumn, deleteColumn } = useSchema()

const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const isEditing = ref(false)
const editingColumn = ref<string | null>(null)

const handleMouseDown = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('.no-drag')) return

  isDragging.value = true
  dragOffset.value = {
    x: e.clientX - props.table.position.x,
    y: e.clientY - props.table.position.y
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    updateTable(props.table.id, {
      position: {
        x: e.clientX - dragOffset.value.x,
        y: e.clientY - dragOffset.value.y
      }
    })
  }
}

const handleMouseUp = () => {
  isDragging.value = false
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

const handleUpdateColumnName = (columnId: string, e: Event) => {
  const value = (e.target as HTMLInputElement).value
  updateColumn(props.table.id, columnId, { name: value })
}

const handleUpdateColumnType = (columnId: string, e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  updateColumn(props.table.id, columnId, { type: value })
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
</script>

<template>
  <div
    class="absolute bg-white rounded-lg shadow-lg border-2 border-gray-300 cursor-move select-none hover:shadow-xl transition-shadow"
    :style="{
      left: `${table.position.x}px`,
      top: `${table.position.y}px`,
      width: '280px'
    }"
    :class="{ 'opacity-80': isDragging }"
    @mousedown="handleMouseDown"
  >
    <!-- Table header -->
    <div class="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
      <input
        v-model="table.name"
        @input="handleUpdateTableName"
        class="no-drag bg-transparent border-none outline-none font-semibold text-lg flex-1 text-white placeholder-blue-200"
        placeholder="table_name"
      />
      <button
        @click.stop="handleDeleteTable"
        class="no-drag ml-2 p-1 hover:bg-blue-700 rounded transition-colors"
        title="Delete table"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Columns -->
    <div class="p-2">
      <div
        v-for="column in table.columns"
        :key="column.id"
        class="no-drag flex items-center gap-2 p-2 hover:bg-gray-50 rounded group"
      >
        <span class="text-base">{{ getColumnIcon(column) }}</span>
        <input
          v-model="column.name"
          @input="(e) => handleUpdateColumnName(column.id, e)"
          class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="column_name"
        />
        <select
          :value="column.type"
          @change="(e) => handleUpdateColumnType(column.id, e)"
          class="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="integer">integer</option>
          <option value="varchar">varchar</option>
          <option value="text">text</option>
          <option value="boolean">boolean</option>
          <option value="timestamp">timestamp</option>
          <option value="date">date</option>
          <option value="json">json</option>
        </select>
        <button
          @click.stop="() => handleDeleteColumn(column.id)"
          class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
          title="Delete column"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <!-- Add column button -->
      <button
        @click.stop="handleAddColumn"
        class="no-drag w-full mt-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Column
      </button>
    </div>
  </div>
</template>
