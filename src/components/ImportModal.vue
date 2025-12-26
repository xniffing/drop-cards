<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  confirm: [code: string]
  cancel: []
}>()

const code = ref('')

const handleConfirm = () => {
  if (code.value.trim()) {
    emit('confirm', code.value)
    code.value = ''
  }
}

const handleCancel = () => {
  code.value = ''
  emit('cancel')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel()
  } else if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
    handleConfirm()
  }
}

// Focus textarea when modal opens
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const handleModalClick = () => {
  if (textareaRef.value) {
    textareaRef.value.focus()
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
    @click.self="handleCancel"
    @keydown="handleKeydown"
    @click="handleModalClick"
    tabindex="-1"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] flex flex-col"
      @click.stop
    >
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Import Drizzle Schema</h2>
      
      <div class="mb-4">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Paste your Drizzle schema code below. The schema should include table definitions using <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">pgTable()</code> and optional relations using <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">relations()</code>.
        </p>
      </div>

      <div class="flex-1 flex flex-col min-h-0 mb-6">
        <textarea
          ref="textareaRef"
          v-model="code"
          placeholder="export const users = pgTable('users', {&#10;  id: serial('id').primaryKey(),&#10;  email: varchar('email', { length: 255 }).notNull().unique(),&#10;  name: text('name').notNull(),&#10;})&#10;&#10;export const posts = pgTable('posts', {&#10;  id: serial('id').primaryKey(),&#10;  userId: integer('user_id').notNull(),&#10;  title: text('title').notNull(),&#10;})&#10;&#10;// Relations&#10;export const usersRelations = relations(users, ({ many }) => ({&#10;  posts: many(posts),&#10;}))"
          class="flex-1 w-full p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          style="min-height: 400px;"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          Cancel
        </button>
        <button
          @click="handleConfirm"
          :disabled="!code.trim()"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import Schema
        </button>
      </div>
    </div>
  </div>
</template>

