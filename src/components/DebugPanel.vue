<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSchema } from '../composables/useSchema'

const { tables, relations, selectedRelationId, isDragging, dragSource } = useSchema()

const isOpen = ref(false)

const schemaJson = computed(() => {
  return JSON.stringify({
    tables: tables.value,
    relations: relations.value
  }, null, 2)
})

const debugInfo = computed(() => {
  return {
    tablesCount: tables.value.length,
    relationsCount: relations.value.length,
    selectedRelation: selectedRelationId.value,
    isDragging: isDragging.value,
    dragSource: dragSource.value
  }
})
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50">
    <!-- Toggle Button -->
    <button
      @click="isOpen = !isOpen"
      class="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-sm font-medium"
    >
      {{ isOpen ? 'Hide' : 'Show' }} Debug
    </button>

    <!-- Debug Panel -->
    <div
      v-if="isOpen"
      class="mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden"
      style="width: 600px; max-height: 500px;"
    >
      <!-- Header -->
      <div class="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
        <h3 class="font-semibold">Debug Panel</h3>
        <button
          @click="isOpen = false"
          class="text-gray-300 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 overflow-y-auto" style="max-height: 450px;">
        <!-- Quick Stats -->
        <div class="mb-4 pb-4 border-b border-gray-200">
          <h4 class="font-semibold text-gray-900 mb-2">Quick Stats</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-gray-600">Tables:</span>
              <span class="font-medium ml-2">{{ debugInfo.tablesCount }}</span>
            </div>
            <div>
              <span class="text-gray-600">Relations:</span>
              <span class="font-medium ml-2">{{ debugInfo.relationsCount }}</span>
            </div>
            <div>
              <span class="text-gray-600">Selected Relation:</span>
              <span class="font-medium ml-2">{{ debugInfo.selectedRelation || 'None' }}</span>
            </div>
            <div>
              <span class="text-gray-600">Dragging:</span>
              <span class="font-medium ml-2">{{ debugInfo.isDragging ? 'Yes' : 'No' }}</span>
            </div>
          </div>
          <div v-if="debugInfo.dragSource" class="mt-2 text-xs text-gray-500">
            Drag Source: {{ debugInfo.dragSource.tableId }} → {{ debugInfo.dragSource.columnId }}
          </div>
        </div>

        <!-- Tables List -->
        <div class="mb-4">
          <h4 class="font-semibold text-gray-900 mb-2">Tables</h4>
          <div class="space-y-2">
            <div
              v-for="table in tables"
              :key="table.id"
              class="bg-gray-50 p-2 rounded text-sm"
            >
              <div class="font-medium text-gray-900">{{ table.name }}</div>
              <div class="text-xs text-gray-500 mt-1">
                ID: {{ table.id }} | Position: ({{ table.position.x }}, {{ table.position.y }}) | Columns: {{ table.columns.length }}
              </div>
              <div class="text-xs text-gray-600 mt-1">
                Columns: {{ table.columns.map(c => c.name).join(', ') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Relations List -->
        <div class="mb-4">
          <h4 class="font-semibold text-gray-900 mb-2">Relations</h4>
          <div class="space-y-2">
            <div
              v-for="relation in relations"
              :key="relation.id"
              class="bg-gray-50 p-2 rounded text-sm"
              :class="{ 'ring-2 ring-blue-500': relation.id === selectedRelationId }"
            >
              <div class="font-medium text-gray-900">
                {{ relation.type }}
              </div>
              <div class="text-xs text-gray-600 mt-1">
                {{ tables.find(t => t.id === relation.fromTableId)?.name }}.{{ tables.find(t => t.id === relation.fromTableId)?.columns.find(c => c.id === relation.fromColumnId)?.name }}
                →
                {{ tables.find(t => t.id === relation.toTableId)?.name }}.{{ tables.find(t => t.id === relation.toTableId)?.columns.find(c => c.id === relation.toColumnId)?.name }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                ID: {{ relation.id }}
              </div>
            </div>
          </div>
        </div>

        <!-- JSON Output -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-2">JSON Schema</h4>
          <pre class="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">{{ schemaJson }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

