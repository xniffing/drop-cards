<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSchema } from '../composables/useSchema'
import type { Column, Relation } from '../types/schema'

const props = defineProps<{
  column: Column | null
  tableId: string | null
  tableName: string
  open: boolean
}>()

const emit = defineEmits<{
  confirm: [updates: Partial<Column>]
  cancel: []
}>()

const { relations, tables, selectRelation } = useSchema()
const formData = ref<Partial<Column>>({})

// Find relations connected to this column
const columnRelations = computed(() => {
  if (!props.column || !props.tableId) return []
  
  return relations.value.filter(
    r => (r.fromTableId === props.tableId && r.fromColumnId === props.column!.id) ||
         (r.toTableId === props.tableId && r.toColumnId === props.column!.id)
  )
})

const getRelationLabel = (relation: Relation) => {
  const fromTable = tables.value.find(t => t.id === relation.fromTableId)
  const toTable = tables.value.find(t => t.id === relation.toTableId)
  const fromColumn = fromTable?.columns.find(c => c.id === relation.fromColumnId)
  const toColumn = toTable?.columns.find(c => c.id === relation.toColumnId)
  
  if (!fromTable || !toTable || !fromColumn || !toColumn) return ''
  
  const isFrom = relation.fromTableId === props.tableId && relation.fromColumnId === props.column?.id
  
  if (isFrom) {
    return `${toTable.name}.${toColumn.name}`
  } else {
    return `${fromTable.name}.${fromColumn.name}`
  }
}

const getRelationTypeColor = (type: Relation['type']) => {
  switch (type) {
    case 'one-to-one':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-600'
    case 'one-to-many':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600'
    case 'many-to-many':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-600'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
  }
}

const handleRelationClick = (relationId: string) => {
  selectRelation(relationId)
}

watch(() => props.column, (column) => {
  if (column) {
    formData.value = {
      name: column.name,
      type: column.type,
      nullable: column.nullable,
      primaryKey: column.primaryKey,
      unique: column.unique,
      autoIncrement: column.autoIncrement
    }
  }
}, { immediate: true })

const handleConfirm = () => {
  emit('confirm', formData.value)
}

const handleCancel = () => {
  emit('cancel')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel()
  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    handleConfirm()
  }
}

const handleWheel = (e: WheelEvent) => {
  // Stop wheel events from propagating to canvas (which would trigger zoom)
  e.stopPropagation()
}
</script>

<template>
  <Transition name="slide">
    <aside
      v-if="open && column"
      class="absolute inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl z-40 flex flex-col overflow-hidden"
      @keydown="handleKeydown"
      @wheel.stop="handleWheel"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Configure Column</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span class="font-medium">{{ tableName }}</span>
            <span class="mx-1">·</span>
            <span class="font-mono">{{ column.id }}</span>
          </p>
        </div>
        <button
          @click="handleCancel"
          class="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        <div class="space-y-6">
          <!-- Name -->
          <div>
            <label for="column-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              id="column-name"
              v-model="formData.name"
              type="text"
              class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              placeholder="column_name"
            />
          </div>

          <!-- Type -->
          <div>
            <label for="column-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              id="column-type"
              v-model="formData.type"
              class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="integer">integer</option>
              <option value="varchar">varchar</option>
              <option value="text">text</option>
              <option value="boolean">boolean</option>
              <option value="timestamp">timestamp</option>
              <option value="date">date</option>
              <option value="json">json</option>
            </select>
          </div>

          <!-- Relations -->
          <div v-if="columnRelations.length > 0">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Relations</label>
            <div class="space-y-2">
              <button
                v-for="relation in columnRelations"
                :key="relation.id"
                @click="handleRelationClick(relation.id)"
                class="w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                :class="getRelationTypeColor(relation.type)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-semibold uppercase">{{ relation.type }}</span>
                    </div>
                    <div class="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                      {{ getRelationLabel(relation) }}
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <!-- Properties -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Properties</label>
            <div class="space-y-3">
              <label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  v-model="formData.nullable"
                  class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div class="flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Nullable</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Allow NULL values</p>
                </div>
              </label>

              <label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  v-model="formData.primaryKey"
                  class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div class="flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Primary Key</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Unique identifier for the table</p>
                </div>
              </label>

              <label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  v-model="formData.unique"
                  class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div class="flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Unique</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">All values must be unique</p>
                </div>
              </label>

              <label class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  v-model="formData.autoIncrement"
                  class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div class="flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Auto Increment</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automatically increment value</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          Cancel
        </button>
        <button
          @click="handleConfirm"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          Save Changes
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-enter-to {
  transform: translateX(0);
}

.slide-leave-from {
  transform: translateX(0);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>

