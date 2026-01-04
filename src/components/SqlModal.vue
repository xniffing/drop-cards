<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  sql: string
}>()

const emit = defineEmits<{
  cancel: []
}>()

const handleCancel = () => {
  emit('cancel')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.sql)
    alert('SQL migration script copied to clipboard!')
  } catch {
    // Fallback: show in a prompt
    const textarea = document.createElement('textarea')
    textarea.value = props.sql
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('SQL migration script copied to clipboard!')
  }
}

const handleDownload = () => {
  const blob = new Blob([props.sql], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'migration.sql'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Focus textarea when modal opens
const textareaRef = ref<HTMLTextAreaElement | null>(null)
watch(() => props.open, (isOpen) => {
  if (isOpen && textareaRef.value) {
    setTimeout(() => {
      textareaRef.value?.focus()
    }, 100)
  }
})
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
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] flex flex-col"
      @click.stop
    >
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">SQL Migration Script</h2>
      
      <div class="mb-4">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          SQL migration script for Cloudflare D1 (SQLite). This script creates all tables and indexes from your schema.
        </p>
      </div>

      <div class="flex-1 flex flex-col min-h-0 mb-6">
        <textarea
          ref="textareaRef"
          :value="sql"
          readonly
          class="flex-1 w-full p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          style="min-height: 400px;"
        ></textarea>
      </div>

      <div class="flex justify-between items-center">
        <div class="flex gap-3">
          <button
            @click="handleCopy"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            Copy to Clipboard
          </button>
          <button
            @click="handleDownload"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            Download SQL
          </button>
        </div>
        <button
          @click="handleCancel"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
