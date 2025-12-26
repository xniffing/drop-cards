<script setup lang="ts">
import { inject, onMounted, onUnmounted } from 'vue'
import { useSchema } from '../composables/useSchema'

const addTable = inject<() => void>('addTable')
const { undo, redo, canUndo, canRedo, exportToDrizzle } = useSchema()

const handleAddTable = () => {
  if (addTable) {
    addTable()
  } else {
    console.error('addTable function not found. Make sure useSchemaProvider is called in App.vue')
  }
}

const handleUndo = () => {
  undo()
}

const handleRedo = () => {
  redo()
}

const handleExport = () => {
  const code = exportToDrizzle()
  
  // Copy to clipboard
  navigator.clipboard.writeText(code).then(() => {
    alert('Drizzle schema code copied to clipboard!')
  }).catch(() => {
    // Fallback: show in a prompt
    const textarea = document.createElement('textarea')
    textarea.value = code
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('Drizzle schema code copied to clipboard!')
  })
}

// Keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  // Don't trigger shortcuts when user is typing in input fields
  const target = e.target as HTMLElement
  const isEditable = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable ||
                     target.closest('input, textarea, [contenteditable="true"]')
  
  if (isEditable) {
    return
  }

  // Ctrl+Z or Cmd+Z for undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    if (canUndo.value) {
      undo()
    }
  }
  // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y for redo
  if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
      ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
    e.preventDefault()
    if (canRedo.value) {
      redo()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
    <button
      @click="handleAddTable"
      class="px-2.5 py-1.5 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span>Add Table</span>
    </button>

    <div class="h-6 w-px bg-gray-300 mx-2"></div>

    <button
      @click="handleUndo"
      :disabled="!canUndo"
      class="px-2.5 py-1.5 bg-gray-100 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
      title="Undo (Ctrl+Z)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
      <span>Undo</span>
    </button>

    <button
      @click="handleRedo"
      :disabled="!canRedo"
      class="px-2.5 py-1.5 bg-gray-100 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
      title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
      </svg>
      <span>Redo</span>
    </button>

    <div class="h-6 w-px bg-gray-300 mx-2"></div>

    <button
      @click="handleExport"
      class="px-2.5 py-1.5 bg-green-600 cursor-pointer text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md"
      type="button"
      title="Export to Drizzle Schema"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      <span>Export to Drizzle</span>
    </button>

    <div class="ml-auto flex items-center gap-2 text-sm text-gray-600">
      <span>Drag tables to position • Click to edit • Drag from ports to create relations</span>
    </div>
  </div>
</template>
