<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue'
import { useSchema } from '../composables/useSchema'
import { useTheme, type ThemeMode } from '../composables/useTheme'
import ImportModal from './ImportModal.vue'
import DatabaseModal from './DatabaseModal.vue'
import HelpModal from './HelpModal.vue'

defineProps<{
  chatOpen: boolean
}>()

const emit = defineEmits<{
  'toggle-chat': []
}>()

const addTable = inject<() => void>('addTable')
const { undo, redo, canUndo, canRedo, autoArrange, isAutoArranging, exportToDrizzle, importFromDrizzle, databases, currentDatabaseName, newEmptySchema, saveDatabase, loadDatabase, deleteDatabaseById, renameDatabase } = useSchema()
const { themeMode, setThemeMode } = useTheme()

const showThemeMenu = ref(false)
const showImportModal = ref(false)
const showDatabaseModal = ref(false)
const showHelpModal = ref(false)

const btnBase =
  'px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
const btnNeutral =
  `${btnBase} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500`
const btnPrimaryBlue =
  `${btnBase} bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800`
const btnPrimaryIndigo =
  `${btnBase} bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800`
const btnPrimaryPurple =
  `${btnBase} bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800`
const btnPrimaryGreen =
  `${btnBase} bg-green-600 text-white hover:bg-green-700 active:bg-green-800`
const btnPrimaryCyan =
  `${btnBase} bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800`
const dividerClass = 'h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1'

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

const handleAutoArrange = async () => {
  const res = await autoArrange()
  if (!res.success) {
    alert(`Auto-arrange failed: ${res.error || 'Unknown error'}`)
  }
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

const handleImport = () => {
  showImportModal.value = true
}

const handleChatToggle = () => {
  emit('toggle-chat')
}

const handleImportConfirm = (code: string) => {
  const result = importFromDrizzle(code)
  showImportModal.value = false
  
  if (result.success) {
    alert('Schema imported successfully!')
  } else {
    alert(`Failed to import schema: ${result.error || 'Unknown error'}`)
  }
}

const handleImportCancel = () => {
  showImportModal.value = false
}

const handleDatabases = () => {
  showDatabaseModal.value = true
}

const handleDatabaseSave = (name: string) => {
  const res = saveDatabase(name)
  if (!res.success) {
    alert(`Failed to save: ${res.error || 'Unknown error'}`)
  }
}

const handleDatabaseLoad = (id: string) => {
  const res = loadDatabase(id)
  if (res.success) {
    showDatabaseModal.value = false
  } else {
    alert(`Failed to load: ${res.error || 'Unknown error'}`)
  }
}

const handleDatabaseRename = (id: string, name: string) => {
  const res = renameDatabase(id, name)
  if (!res.success) {
    alert(`Failed to rename: ${res.error || 'Unknown error'}`)
  }
}

const handleDatabaseDelete = (id: string) => {
  const res = deleteDatabaseById(id)
  if (!res.success) {
    alert(`Failed to delete: ${res.error || 'Unknown error'}`)
  }
}

const handleDatabaseCancel = () => {
  showDatabaseModal.value = false
}

const handleHelp = () => {
  showHelpModal.value = true
}

const handleHelpCancel = () => {
  showHelpModal.value = false
}

const handleDatabaseNewEmpty = () => {
  const ok = confirm('Create a new empty schema? This will replace the current canvas.')
  if (!ok) return
  newEmptySchema()
  showDatabaseModal.value = false
}

// Keyboard shortcuts
const handleKeyDown = async (e: KeyboardEvent) => {
  // Don't trigger shortcuts when user is typing in input fields
  const target = e.target as HTMLElement
  const isEditable = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable ||
                     target.closest('input, textarea, [contenteditable="true"]')
  
  if (isEditable) {
    return
  }

  // Ctrl+L or Cmd+L for auto-arrange
  if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault()
    await handleAutoArrange()
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
  <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3">
    <!-- Left: primary actions -->
    <div class="flex flex-wrap items-center gap-2 min-w-0">
      <button
        @click="handleAddTable"
        :class="btnPrimaryBlue"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add Table</span>
      </button>

      <div :class="dividerClass"></div>

      <button
        @click="handleUndo"
        :disabled="!canUndo"
        :class="btnNeutral"
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
        :class="btnNeutral"
        type="button"
        title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
        </svg>
        <span>Redo</span>
      </button>

      <button
        @click="handleAutoArrange"
        :disabled="isAutoArranging"
        :class="btnNeutral"
        type="button"
        title="Auto Arrange (Ctrl/Cmd+L)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h8M4 18h16M4 12h16M14 6l2-2m-2 2l2 2" />
        </svg>
        <span>{{ isAutoArranging ? 'Arranging…' : 'Auto Arrange' }}</span>
      </button>

      <div :class="dividerClass"></div>

      <button
        @click="handleImport"
        :class="btnPrimaryPurple"
        type="button"
        title="Import from Drizzle Schema"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v-2.25A2.25 2.25 0 015.25 12h13.5A2.25 2.25 0 0121 14.25v2.25M3 16.5l3-3m-3 3l3 3M21 16.5l-3-3m3 3l-3 3M16.5 12V9.75m0 0l-3 3m3-3l3 3" />
        </svg>
        <span>Import</span>
      </button>

      <button
        @click="handleChatToggle"
        :class="chatOpen ? btnPrimaryCyan : btnNeutral"
        type="button"
        title="AI Chat (generate Drizzle schema)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3h6m-8.25 9l3.086-3.086A2.25 2.25 0 0012 16.5h7.5A2.25 2.25 0 0021.75 14.25v-7.5A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v8.25A2.25 2.25 0 004.5 17.25h.879a2.25 2.25 0 011.59.659L10.5 21.44" />
        </svg>
        <span>AI Chat</span>
      </button>

      <button
        @click="handleExport"
        :class="btnPrimaryGreen"
        type="button"
        title="Export to Drizzle Schema"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span>Export</span>
      </button>

      <div :class="dividerClass"></div>

      <button
        @click="handleDatabases"
        :class="btnPrimaryIndigo"
        type="button"
        title="Saved databases (localStorage)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7a4 4 0 018 0v10a4 4 0 01-8 0V7zm8 0a4 4 0 018 0v10a4 4 0 01-8 0V7z" />
        </svg>
        <span>Databases</span>
      </button>
    </div>

    <!-- Right: status & utilities -->
    <div class="ml-auto flex items-center gap-2 shrink-0">
      <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm">
        <span class="text-gray-500 dark:text-gray-400">DB</span>
        <span class="font-medium text-gray-800 dark:text-gray-200 max-w-[240px] truncate">{{ currentDatabaseName }}</span>
      </div>

      <button
        @click="handleHelp"
        :class="btnNeutral"
        type="button"
        title="Help"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.11 2.09-2.186 2.714-.84.486-1.814 1.05-1.814 2.286m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Help</span>
      </button>

      <!-- Theme Toggle -->
      <div class="theme-menu-container relative">
        <button
          @click.stop="showThemeMenu = !showThemeMenu"
          :class="btnNeutral"
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
    </div>

    <!-- Import Modal -->
    <ImportModal
      :open="showImportModal"
      @confirm="handleImportConfirm"
      @cancel="handleImportCancel"
    />

    <!-- Databases Modal -->
    <DatabaseModal
      :open="showDatabaseModal"
      :databases="databases"
      @save="handleDatabaseSave"
      @load="handleDatabaseLoad"
      @rename="handleDatabaseRename"
      @delete="handleDatabaseDelete"
      @new-empty="handleDatabaseNewEmpty"
      @cancel="handleDatabaseCancel"
    />

    <!-- Help Modal -->
    <HelpModal
      :open="showHelpModal"
      @cancel="handleHelpCancel"
    />
  </div>
</template>
