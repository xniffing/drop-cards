<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue'
import { useSchema } from '../composables/useSchema'
import { useTheme, type ThemeMode } from '../composables/useTheme'

const addTable = inject<() => void>('addTable')
const { undo, redo, canUndo, canRedo, exportToDrizzle } = useSchema()
const { themeMode, setThemeMode } = useTheme()

const showThemeMenu = ref(false)

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

const handleThemeSelect = (mode: ThemeMode) => {
  setThemeMode(mode)
  showThemeMenu.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.theme-menu-container')) {
    showThemeMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2">
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

    <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>

    <button
      @click="handleUndo"
      :disabled="!canUndo"
      class="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
      class="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
      title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
      </svg>
      <span>Redo</span>
    </button>

    <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>

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

    <div class="ml-auto flex items-center gap-2">
      <!-- Theme Toggle -->
      <div class="theme-menu-container relative">
        <button
          @click.stop="showThemeMenu = !showThemeMenu"
          class="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md"
          type="button"
          title="Theme"
        >
          <!-- Sun icon for light mode -->
          <svg v-if="themeMode === 'light'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <!-- Moon icon for dark mode -->
          <svg v-else-if="themeMode === 'dark'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <!-- Auto/System icon -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Theme Menu Dropdown -->
        <div
          v-if="showThemeMenu"
          class="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50"
        >
          <button
            @click="handleThemeSelect('light')"
            class="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            :class="{ 'bg-gray-100 dark:bg-gray-700': themeMode === 'light' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Light</span>
            <svg v-if="themeMode === 'light'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            @click="handleThemeSelect('dark')"
            class="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            :class="{ 'bg-gray-100 dark:bg-gray-700': themeMode === 'dark' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span>Dark</span>
            <svg v-if="themeMode === 'dark'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            @click="handleThemeSelect('auto')"
            class="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            :class="{ 'bg-gray-100 dark:bg-gray-700': themeMode === 'auto' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Auto</span>
            <svg v-if="themeMode === 'auto'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>

      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>

      <div class="text-sm text-gray-600 dark:text-gray-400">
        <span>Drag tables to position • Click to edit • Drag from ports to create relations</span>
      </div>
    </div>
  </div>
</template>
