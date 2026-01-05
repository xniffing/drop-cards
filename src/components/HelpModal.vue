<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  cancel: []
}>()

const activeSection = ref('getting-started')

const handleCancel = () => {
  emit('cancel')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleCancel()
}

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
  { id: 'canvas', label: 'Canvas Navigation', icon: '🖱️' },
  { id: 'tables', label: 'Tables', icon: '📊' },
  { id: 'columns', label: 'Columns', icon: '📝' },
  { id: 'relations', label: 'Relations', icon: '🔗' },
  { id: 'export-import', label: 'Export/Import', icon: '💾' },
  { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
  { id: 'tips', label: 'Tips & Tricks', icon: '💡' }
]
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
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Help & Documentation</h2>
        <button
          class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          type="button"
          @click="handleCancel"
          title="Close (Esc)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar Navigation -->
        <div class="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <nav class="p-4 space-y-1">
            <button
              v-for="section in sections"
              :key="section.id"
              @click="activeSection = section.id"
              class="w-full px-3 py-2 text-left text-sm rounded-lg transition-colors flex items-center gap-2"
              :class="activeSection === section.id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
            >
              <span class="text-lg">{{ section.icon }}</span>
              <span>{{ section.label }}</span>
            </button>
          </nav>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Getting Started -->
          <div v-if="activeSection === 'getting-started'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Welcome to Drop Cards DB Studio</h3>
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                A visual database schema designer for Drizzle ORM with Cloudflare D1 (SQLite) support. Create and manage database schemas with an intuitive drag-and-drop interface.
              </p>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick Start</h4>
              <ol class="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">Add Table</strong> button (blue + icon) to create your first table</li>
                <li>Click on the table name to rename it</li>
                <li>Click <strong class="text-gray-900 dark:text-gray-100">Add Column</strong> to add columns to your table</li>
                <li>Drag from a column's drag handle to another column to create a relation</li>
                <li>Use the <strong class="text-gray-900 dark:text-gray-100">Export</strong> menu to generate Drizzle schema code</li>
              </ol>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">What is D1?</h4>
              <p class="text-gray-600 dark:text-gray-400">
                Cloudflare D1 is a SQLite-based database that runs at the edge. This tool generates Drizzle ORM schemas specifically for D1, using SQLite-compatible types and syntax.
              </p>
            </div>
          </div>

          <!-- Canvas Navigation -->
          <div v-if="activeSection === 'canvas'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Canvas Navigation</h3>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Panning</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Middle-click and drag</strong> - Pan the canvas</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Click and drag on empty space</strong> - Also pans the canvas</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Zooming</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Mouse wheel</strong> - Zoom in/out (centered on cursor position)</li>
                <li>Zoom level is displayed in the toolbar (top right)</li>
                <li>Zoom range: 25% to 300%</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Selection</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Click on empty canvas</strong> - Deselect all</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Click and drag on empty canvas</strong> - Select multiple tables</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Shift/Ctrl/Cmd + Click</strong> - Add to selection</li>
                <li>Selected tables can be moved together</li>
              </ul>
            </div>
          </div>

          <!-- Tables -->
          <div v-if="activeSection === 'tables'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Working with Tables</h3>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Creating Tables</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">Add Table</strong> button (blue + icon) in the toolbar</li>
                <li>A new table will appear with a default name and an ID column</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Editing Tables</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Click on table name</strong> - Edit the table name inline</li>
                <li>Table names are used in the generated Drizzle schema</li>
                <li>Table header colors indicate hierarchy level (based on relations)</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Moving Tables</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Click and drag</strong> - Move a single table</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Select multiple tables</strong> - Then drag to move them together</li>
                <li>Use <strong class="text-gray-900 dark:text-gray-100">Auto Arrange</strong> button to automatically organize tables</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Deleting Tables</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">trash icon</strong> in the table header</li>
                <li>Deleting a table also removes all its relations</li>
              </ul>
            </div>
          </div>

          <!-- Columns -->
          <div v-if="activeSection === 'columns'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Working with Columns</h3>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Adding Columns</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">Add Column</strong> button at the bottom of a table</li>
                <li>New columns are added with default settings (varchar, nullable)</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Editing Columns</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Click on column name or type</strong> - Edit inline</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Click the column config icon</strong> - Open advanced settings modal</li>
                <li>In the config modal, you can set: nullable, primary key, unique, auto-increment</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Column Types</h4>
              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><strong class="text-gray-900 dark:text-gray-100">integer</strong> - Whole numbers</li>
                  <li><strong class="text-gray-900 dark:text-gray-100">varchar</strong> - Variable-length text (stored as TEXT in SQLite)</li>
                  <li><strong class="text-gray-900 dark:text-gray-100">text</strong> - Text data</li>
                  <li><strong class="text-gray-900 dark:text-gray-100">decimal</strong> - Decimal numbers (stored as REAL in SQLite)</li>
                  <li><strong class="text-gray-900 dark:text-gray-100">boolean</strong> - True/false (stored as INTEGER 0/1 in SQLite)</li>
                  <li><strong class="text-gray-900 dark:text-gray-100">timestamp</strong> - Date and time (stored as INTEGER Unix time in SQLite)</li>
                  <li><strong class="text-gray-900 dark:text-gray-100">date</strong> - Date only (stored as TEXT ISO format in SQLite)</li>
                  <li><strong class="text-gray-900 dark:text-gray-100">json</strong> - JSON data (stored as TEXT in SQLite)</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Column Properties</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Primary Key</strong> - Unique identifier for the row</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Auto Increment</strong> - Automatically generates sequential numbers (integer only)</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Unique</strong> - Ensures no duplicate values</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Nullable</strong> - Allows NULL values (default: true)</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Deleting Columns</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">trash icon</strong> next to a column</li>
                <li>Deleting a column also removes all relations that use it</li>
              </ul>
            </div>
          </div>

          <!-- Relations -->
          <div v-if="activeSection === 'relations'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Working with Relations</h3>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Creating Relations</h4>
              <ol class="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Hover over a column to see the <strong class="text-gray-900 dark:text-gray-100">drag handle</strong> (six dots)</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Click and drag</strong> from the drag handle</li>
                <li>Drag to another column in a different table</li>
                <li>Release to create the relation</li>
                <li>Select the relation type (one-to-one, one-to-many, many-to-many)</li>
              </ol>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Relation Types</h4>
              <div class="space-y-4">
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h5 class="font-semibold text-blue-900 dark:text-blue-200 mb-2">One-to-One</h5>
                  <p class="text-sm text-blue-800 dark:text-blue-300">
                    Each record in the source table relates to exactly one record in the target table. The foreign key column should be unique.
                  </p>
                </div>
                <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h5 class="font-semibold text-green-900 dark:text-green-200 mb-2">One-to-Many</h5>
                  <p class="text-sm text-green-800 dark:text-green-300">
                    Each record in the source table can relate to multiple records in the target table. This is the most common relation type.
                  </p>
                </div>
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h5 class="font-semibold text-amber-900 dark:text-amber-200 mb-2">Many-to-Many</h5>
                  <p class="text-sm text-amber-800 dark:text-amber-300">
                    Multiple records in the source table can relate to multiple records in the target table. Typically requires a junction table in the database.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Editing Relations</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Click on a relation line</strong> - Opens the relation editor</li>
                <li>Change the relation type, source table/column, or target table/column</li>
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">trash icon</strong> to delete the relation</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Relation Colors</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Relation lines are color-coded by type for easy identification</li>
                <li>Hover over a relation to highlight it</li>
                <li>Selected relations are highlighted with a thicker line</li>
              </ul>
            </div>
          </div>

          <!-- Export/Import -->
          <div v-if="activeSection === 'export-import'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Export & Import</h3>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Export Menu</h4>
              <p class="text-gray-600 dark:text-gray-400 mb-3">Click the green Export button in the toolbar to access export options:</p>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Drizzle Schema</strong> - Copy TypeScript Drizzle schema code to clipboard</li>
                <li><strong class="text-gray-900 dark:text-gray-100">SQL Migration</strong> - View and download SQL migration script for D1</li>
                <li><strong class="text-gray-900 dark:text-gray-100">OpenAPI JSON</strong> - Export OpenAPI 3.1 specification</li>
                <li><strong class="text-gray-900 dark:text-gray-100">API Docs</strong> - Open Swagger UI with your API documentation</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Save & Load Files</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li><strong class="text-gray-900 dark:text-gray-100">Save to File</strong> - Click the indigo save button to download your current schema as a JSON file</li>
                <li>Files are saved with a date-stamped filename (e.g., <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">schema-2024-01-15.json</code>)</li>
                <li><strong class="text-gray-900 dark:text-gray-100">Load from File</strong> - Click the indigo load button to import a previously saved schema JSON file</li>
                <li>You'll be asked to confirm before replacing your current canvas</li>
                <li>File format includes all tables, columns, relations, and positions</li>
                <li>Useful for backing up your work or sharing schemas with others</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Import Drizzle Code</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">Import</strong> button (purple icon)</li>
                <li>Paste your Drizzle schema code (must use <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">sqliteTable()</code>)</li>
                <li>The schema will be parsed and imported into the canvas</li>
                <li>Relations are automatically inferred from <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">.references()</code> and <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">relations()</code> blocks</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">AI Chat</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the <strong class="text-gray-900 dark:text-gray-100">AI Chat</strong> button to open the chat panel</li>
                <li>Describe the schema you want in natural language</li>
                <li>The AI will generate Drizzle schema code and import it automatically</li>
                <li>Requires OpenRouter API key (set in <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env</code> file)</li>
              </ul>
            </div>
          </div>

          <!-- Keyboard Shortcuts -->
          <div v-if="activeSection === 'shortcuts'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Keyboard Shortcuts</h3>
            </div>

            <div class="space-y-4">
              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Canvas</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 dark:text-gray-400">Auto Arrange</span>
                    <kbd class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + L</kbd>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">History</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 dark:text-gray-400">Undo</span>
                    <kbd class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + Z</kbd>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 dark:text-gray-400">Redo</span>
                    <kbd class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + Shift + Z</kbd>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 dark:text-gray-400">Redo (Alternative)</span>
                    <kbd class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + Y</kbd>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Modals</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 dark:text-gray-400">Close Modal</span>
                    <kbd class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tips & Tricks -->
          <div v-if="activeSection === 'tips'" class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Tips & Tricks</h3>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Workflow Tips</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Use <strong class="text-gray-900 dark:text-gray-100">Auto Arrange</strong> after importing a schema to automatically organize tables</li>
                <li>Table header colors indicate hierarchy - root tables (no incoming relations) are blue</li>
                <li>Save your work using the <strong class="text-gray-900 dark:text-gray-100">Databases</strong> button to create named snapshots (stored in browser localStorage)</li>
                <li>Use <strong class="text-gray-900 dark:text-gray-100">Save to File</strong> to backup your schema or share it with others</li>
                <li>Use the AI Chat to quickly generate common schema patterns</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Best Practices</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Use descriptive table and column names (they appear in generated code)</li>
                <li>Set appropriate column types - SQLite is flexible but types help with validation</li>
                <li>Add indexes for foreign keys (automatically generated in SQL export)</li>
                <li>Use nullable columns only when necessary</li>
                <li>Consider using auto-increment for primary keys when appropriate</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">D1/SQLite Specifics</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>SQLite doesn't have native DECIMAL type - it's stored as REAL (floating point)</li>
                <li>BOOLEAN is stored as INTEGER (0 or 1)</li>
                <li>TIMESTAMP is stored as INTEGER (Unix timestamp)</li>
                <li>JSON is stored as TEXT - parse it in your application code</li>
                <li>VARCHAR and TEXT are treated the same in SQLite</li>
              </ul>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Troubleshooting</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>If import fails, check that your schema uses <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">sqliteTable()</code> not <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">pgTable()</code></li>
                <li>Relations not showing? Make sure both tables and columns exist</li>
                <li>Can't create relation? Check that you're connecting to different tables</li>
                <li>Zoom not working? Make sure you're scrolling over the canvas area</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
