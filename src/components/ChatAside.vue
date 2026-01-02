<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSchema } from '../composables/useSchema'
import { openRouterChat, type OpenRouterMessage } from '../services/openrouter'

const emit = defineEmits<{
  close: []
}>()

type ChatItem = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

const { importFromDrizzle, exportToDrizzle, tables, autoArrange } = useSchema()

const apiKey = computed(() => import.meta.env.VITE_OPENROUTER_API_KEY || '')
const model = 'google/gemma-3-27b-it:free'

const prompt = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const lastGeneratedCode = ref<string | null>(null)
const showGenerated = ref(false)
const items = ref<ChatItem[]>([])
const includeSchemaContext = ref(true)

const abortController = ref<AbortController | null>(null)

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const systemPrompt = `You are helping design a PostgreSQL database schema and (when ready) generating a Drizzle ORM schema.

If you need clarification, ask follow-up questions in plain text.
If you have enough information, return ONLY TypeScript code (no markdown, no explanations).

Requirements:
- Use pgTable(...) definitions with exports like: export const users = pgTable('users', { ... })
- Use pg-core types: serial, integer, text, varchar, boolean, timestamp, date, jsonb
- For foreign keys, prefer inline references so relations can be inferred:
  userId: integer('user_id').notNull().references(() => users.id)
- Keep column property names valid identifiers (camelCase recommended) and consistent with references.
- Include primary keys and notNull where appropriate.
- When refining an existing schema, output the FULL updated schema (not a diff).
`

const extractDrizzleCode = (raw: string): string => {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''

  // If the model ignores instructions and wraps in ```...```, extract the first code fence.
  const fenceMatch = trimmed.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/i)
  const text = (fenceMatch?.[1] ?? trimmed).trim()

  return text
}

const looksLikeDrizzleSchema = (code: string): boolean => {
  const t = (code || '').trim()
  if (!t) return false
  return t.includes('pgTable(') && /export\s+const\s+\w+\s*=/.test(t)
}

const buildConversationMessages = (): OpenRouterMessage[] => {
  // Keep the most recent turns to avoid overly large prompts.
  const recent = items.value.slice(-12)
  return recent.map(m => ({
    role: m.role,
    content: m.content
  }))
}

const send = async () => {
  if (isLoading.value) return
  error.value = null

  const userText = prompt.value.trim()
  if (!userText) return
  prompt.value = ''

  items.value.push({
    id: createId(),
    role: 'user',
    content: userText,
    createdAt: Date.now()
  })

  if (!apiKey.value.trim()) {
    error.value = 'Missing VITE_OPENROUTER_API_KEY. Add it to your .env and restart dev server.'
    return
  }

  isLoading.value = true
  const controller = new AbortController()
  abortController.value = controller

  try {
    const schemaContext =
      includeSchemaContext.value && tables.value.length > 0
        ? `CURRENT_SCHEMA_DRIZZLE\n${exportToDrizzle()}\nEND_CURRENT_SCHEMA_DRIZZLE`
        : ''

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(schemaContext ? [{ role: 'system' as const, content: schemaContext }] : []),
      ...buildConversationMessages()
    ]

    const assistantText = await openRouterChat({
      apiKey: apiKey.value,
      model,
      messages,
      temperature: 0.25,
      signal: controller.signal,
      title: 'Drop Cards DB Studio'
    })

    items.value.push({
      id: createId(),
      role: 'assistant',
      content: assistantText,
      createdAt: Date.now()
    })

    const code = extractDrizzleCode(assistantText)
    lastGeneratedCode.value = code
    showGenerated.value = looksLikeDrizzleSchema(code)

    if (looksLikeDrizzleSchema(code)) {
      const result = importFromDrizzle(code)
      if (!result.success) {
        error.value = `Generated schema could not be imported: ${result.error || 'Unknown error'}`
      } else {
        const arranged = await autoArrange()
        if (!arranged.success) {
          error.value = `Auto-arrange failed: ${arranged.error || 'Unknown error'}`
        }
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return
    error.value = e instanceof Error ? e.message : 'Request failed'
  } finally {
    isLoading.value = false
    abortController.value = null
  }
}

const cancel = () => {
  abortController.value?.abort()
  abortController.value = null
  isLoading.value = false
}

const copyLastGeneratedCode = async () => {
  const code = lastGeneratedCode.value || ''
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    // ignore clipboard failures (permissions / insecure context)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isLoading.value) cancel()
    else emit('close')
    return
  }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    void send()
  }
}

onBeforeUnmount(() => {
  abortController.value?.abort()
})
</script>

<template>
  <aside
    class="h-full w-[420px] shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col"
    @keydown="handleKeydown"
    tabindex="-1"
  >
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
      <div class="min-w-0">
        <div class="font-semibold text-gray-900 dark:text-gray-100 truncate">AI Chat</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 truncate">Model: {{ model }}</div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          @click="showGenerated = !showGenerated"
          :disabled="!lastGeneratedCode"
          :class="{ 'opacity-50 cursor-not-allowed': !lastGeneratedCode }"
          title="Toggle last generated code"
        >
          Code
        </button>
        <button
          type="button"
          class="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          @click="emit('close')"
          title="Close (Esc)"
        >
          Close
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3">
      <div v-if="error" class="text-sm rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-2">
        {{ error }}
      </div>

      <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 select-none">
        <input v-model="includeSchemaContext" type="checkbox" class="rounded border-gray-300 dark:border-gray-600" />
        Include current canvas schema as context
      </label>

      <div v-if="items.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
        Describe the schema you want. I’ll generate a Drizzle schema and import it into the canvas automatically.
      </div>

      <div v-for="m in items" :key="m.id" class="text-sm">
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          {{ m.role }}
        </div>
        <div
          class="rounded-md px-3 py-2 whitespace-pre-wrap break-words"
          :class="m.role === 'user'
            ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 border border-blue-100 dark:border-blue-900'
            : 'bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'"
        >
          {{ m.content }}
        </div>
      </div>

      <div v-if="showGenerated && lastGeneratedCode" class="mt-2">
        <div class="flex items-center gap-2 mb-2">
          <div class="text-xs font-semibold text-gray-700 dark:text-gray-200">Last generated Drizzle code</div>
          <button
            type="button"
            class="ml-auto px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            @click="copyLastGeneratedCode"
          >
            Copy
          </button>
        </div>
        <pre class="text-xs overflow-x-auto rounded-md bg-gray-900 dark:bg-gray-950 text-green-300 p-3 border border-gray-800">{{ lastGeneratedCode }}</pre>
      </div>
    </div>

    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <textarea
        v-model="prompt"
        class="w-full p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        rows="4"
        placeholder="Describe the schema… (Cmd/Ctrl+Enter to send, Esc to close)"
        :disabled="isLoading"
      ></textarea>

      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="flex-1 px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="send"
          :disabled="isLoading || !prompt.trim()"
        >
          {{ isLoading ? 'Generating…' : 'Send' }}
        </button>
        <button
          type="button"
          class="px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="cancel"
          :disabled="!isLoading"
        >
          Cancel
        </button>
      </div>
    </div>
  </aside>
</template>


