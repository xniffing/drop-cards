<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type DatabaseListItem = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

const props = defineProps<{
  open: boolean
  databases: DatabaseListItem[]
}>()

const emit = defineEmits<{
  save: [name: string]
  load: [id: string]
  rename: [id: string, name: string]
  delete: [id: string]
  newEmpty: []
  cancel: []
}>()

const name = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) name.value = ''
  }
)

const canSave = computed(() => name.value.trim().length > 0)

const formatTime = (ms: number) => {
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return ''
  }
}

const handleSave = () => {
  const trimmed = name.value.trim()
  if (!trimmed) return
  emit('save', trimmed)
  name.value = ''
}

const handleCancel = () => {
  name.value = ''
  emit('cancel')
}

const handleRename = (id: string, current: string) => {
  const next = window.prompt('Rename database', current)
  if (next == null) return
  const trimmed = next.trim()
  if (!trimmed) return
  emit('rename', id, trimmed)
}

const handleDelete = (id: string, current: string) => {
  const ok = window.confirm(`Delete "${current}"? This cannot be undone.`)
  if (!ok) return
  emit('delete', id)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel()
  } else if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
    handleSave()
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
    @click.self="handleCancel"
    @keydown="handleKeydown"
    tabindex="-1"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6 max-h-[90vh] flex flex-col"
      @click.stop
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Databases</h2>
        <button
          class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          @click="handleCancel"
          type="button"
        >
          Close
        </button>
      </div>

      <div class="mb-4">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Save the current schema to localStorage as a named database. You can later load or delete it.
        </p>

        <div class="flex gap-3">
          <input
            v-model="name"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder="Database name (e.g. billing-prod)"
            type="text"
          />
          <button
            @click="handleSave"
            :disabled="!canSave"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            title="Save (Ctrl/Cmd+Enter)"
          >
            Save current
          </button>
        </div>

        <div class="mt-3 flex justify-between items-center">
          <button
            class="px-3 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-gray-900 rounded-md hover:bg-gray-900 dark:hover:bg-black"
            type="button"
            @click="emit('newEmpty')"
            title="Create a new empty schema"
          >
            New (empty)
          </button>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Tip: loading replaces the current canvas.
          </div>
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md">
        <div v-if="databases.length === 0" class="p-4 text-sm text-gray-600 dark:text-gray-400">
          No saved databases yet.
        </div>

        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="db in databases"
            :key="db.id"
            class="p-4 flex items-center gap-3"
          >
            <div class="min-w-0 flex-1">
              <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ db.name }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                Updated: {{ formatTime(db.updatedAt) }}
              </div>
            </div>

            <div class="flex gap-2 shrink-0">
              <button
                class="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                @click="emit('load', db.id)"
                type="button"
              >
                Load
              </button>
              <button
                class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                @click="handleRename(db.id, db.name)"
                type="button"
              >
                Rename
              </button>
              <button
                class="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                @click="handleDelete(db.id, db.name)"
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


