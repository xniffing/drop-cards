<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Relation } from '../types/schema'

const props = defineProps<{
  fromTableName: string
  fromColumnName: string
  toTableName: string
  toColumnName: string
}>()

const emit = defineEmits<{
  confirm: [type: Relation['type']]
  cancel: []
}>()

const selectedType = ref<Relation['type']>('one-to-many')

const relationTypes: Array<{ value: Relation['type']; label: string; description: string }> = [
  {
    value: 'one-to-one',
    label: 'One-to-One',
    description: 'Each record in the source table relates to exactly one record in the target table'
  },
  {
    value: 'one-to-many',
    label: 'One-to-Many',
    description: 'Each record in the source table can relate to multiple records in the target table'
  },
  {
    value: 'many-to-many',
    label: 'Many-to-Many',
    description: 'Multiple records in the source table can relate to multiple records in the target table'
  }
]

const handleConfirm = () => {
  emit('confirm', selectedType.value)
}

const handleCancel = () => {
  emit('cancel')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel()
  } else if (e.key === 'Enter') {
    handleConfirm()
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleCancel"
    @keydown="handleKeydown"
    tabindex="-1"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      @click.stop
    >
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Create Relation</h2>
      
      <div class="mb-6">
        <p class="text-sm text-gray-600 mb-2">
          From: <span class="font-medium">{{ fromTableName }}.{{ fromColumnName }}</span>
        </p>
        <p class="text-sm text-gray-600">
          To: <span class="font-medium">{{ toTableName }}.{{ toColumnName }}</span>
        </p>
      </div>

      <div class="space-y-3 mb-6">
        <label
          v-for="type in relationTypes"
          :key="type.value"
          class="flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors"
          :class="selectedType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
        >
          <input
            type="radio"
            :value="type.value"
            v-model="selectedType"
            class="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
          />
          <div class="flex-1">
            <div class="font-medium text-gray-900">{{ type.label }}</div>
            <div class="text-sm text-gray-500 mt-1">{{ type.description }}</div>
          </div>
        </label>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          @click="handleConfirm"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Relation
        </button>
      </div>
    </div>
  </div>
</template>

