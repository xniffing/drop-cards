<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  cancel: []
}>()

const handleCancel = () => {
  emit('cancel')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleCancel()
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
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full mx-4 p-6"
      @click.stop
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Help</h2>
        <button
          class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          type="button"
          @click="handleCancel"
        >
          Close
        </button>
      </div>

      <div class="text-sm text-gray-700 dark:text-gray-200">
        <div class="font-medium mb-2">Canvas basics</div>
        <ul class="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
          <li>Drag tables to position</li>
          <li>Click to edit</li>
          <li>Drag from ports to create relations</li>
        </ul>
      </div>
    </div>
  </div>
</template>


