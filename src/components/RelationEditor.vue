<script setup lang="ts">
import { computed } from 'vue'
import { useSchema } from '../composables/useSchema'
import type { Relation } from '../types/schema'

const props = defineProps<{
  relation: Relation
  position?: { x: number; y: number } | null
}>()

const { tables, updateRelation, deleteRelation, deselectRelation, validateRelation } = useSchema()

const fromTable = computed(() => tables.value.find(t => t.id === props.relation.fromTableId))
const toTable = computed(() => tables.value.find(t => t.id === props.relation.toTableId))

const relationTypes: Array<{ value: Relation['type']; label: string }> = [
  { value: 'one-to-one', label: 'One-to-One' },
  { value: 'one-to-many', label: 'One-to-Many' },
  { value: 'many-to-many', label: 'Many-to-Many' }
]

const handleTypeChange = (e: Event) => {
  const newType = (e.target as HTMLSelectElement).value as Relation['type']
  updateRelation(props.relation.id, { type: newType })
}

const handleFromTableChange = (e: Event) => {
  const newTableId = (e.target as HTMLSelectElement).value
  const newTable = tables.value.find(t => t.id === newTableId)
  if (newTable && newTable.columns.length > 0) {
    updateRelation(props.relation.id, {
      fromTableId: newTableId,
      fromColumnId: newTable.columns[0].id
    })
  }
}

const handleFromColumnChange = (e: Event) => {
  const newColumnId = (e.target as HTMLSelectElement).value
  updateRelation(props.relation.id, { fromColumnId: newColumnId })
}

const handleToTableChange = (e: Event) => {
  const newTableId = (e.target as HTMLSelectElement).value
  const newTable = tables.value.find(t => t.id === newTableId)
  if (newTable && newTable.columns.length > 0) {
    updateRelation(props.relation.id, {
      toTableId: newTableId,
      toColumnId: newTable.columns[0].id
    })
  }
}

const handleToColumnChange = (e: Event) => {
  const newColumnId = (e.target as HTMLSelectElement).value
  updateRelation(props.relation.id, { toColumnId: newColumnId })
}

const handleDelete = () => {
  if (confirm('Delete this relation?')) {
    deleteRelation(props.relation.id)
    deselectRelation()
  }
}

const handleClose = () => {
  deselectRelation()
}
</script>

<template>
  <div
    v-if="position"
    class="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-4 w-80 z-50"
    :style="{
      left: `${position.x + 20}px`,
      top: `${position.y - 100}px`
    }"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Relation</h3>
      <button
        @click="handleClose"
        class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="space-y-4">
      <!-- Relation Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relation Type</label>
        <select
          :value="relation.type"
          @change="handleTypeChange"
          class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option
            v-for="type in relationTypes"
            :key="type.value"
            :value="type.value"
          >
            {{ type.label }}
          </option>
        </select>
      </div>

      <!-- From Table -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Table</label>
        <select
          :value="relation.fromTableId"
          @change="handleFromTableChange"
          class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option
            v-for="table in tables"
            :key="table.id"
            :value="table.id"
          >
            {{ table.name }}
          </option>
        </select>
      </div>

      <!-- From Column -->
      <div v-if="fromTable">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Column</label>
        <select
          :value="relation.fromColumnId"
          @change="handleFromColumnChange"
          class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option
            v-for="column in fromTable.columns"
            :key="column.id"
            :value="column.id"
          >
            {{ column.name }}
          </option>
        </select>
      </div>

      <!-- To Table -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Table</label>
        <select
          :value="relation.toTableId"
          @change="handleToTableChange"
          class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option
            v-for="table in tables"
            :key="table.id"
            :value="table.id"
          >
            {{ table.name }}
          </option>
        </select>
      </div>

      <!-- To Column -->
      <div v-if="toTable">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Column</label>
        <select
          :value="relation.toColumnId"
          @change="handleToColumnChange"
          class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option
            v-for="column in toTable.columns"
            :key="column.id"
            :value="column.id"
          >
            {{ column.name }}
          </option>
        </select>
      </div>

      <!-- Delete Button -->
      <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="handleDelete"
          class="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded-md hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400"
        >
          Delete Relation
        </button>
      </div>
    </div>
  </div>
</template>

