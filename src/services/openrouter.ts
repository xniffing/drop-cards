export type OpenRouterRole = 'system' | 'user' | 'assistant'

export interface OpenRouterMessage {
  role: OpenRouterRole
  content: string
}

export interface OpenRouterChatOptions {
  apiKey: string
  model: string
  messages: OpenRouterMessage[]
  signal?: AbortSignal
  temperature?: number
  maxTokens?: number
  referer?: string
  title?: string
}

export async function openRouterChat({
  apiKey,
  model,
  messages,
  signal,
  temperature = 0.25,
  maxTokens,
  referer,
  title
}: OpenRouterChatOptions): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Missing OpenRouter API key (VITE_OPENROUTER_API_KEY)')
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(referer ? { 'HTTP-Referer': referer } : {}),
      ...(title ? { 'X-Title': title } : {})
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(typeof maxTokens === 'number' ? { max_tokens: maxTokens } : {})
    }),
    signal
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenRouter error (${res.status}): ${text || res.statusText}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: unknown
  }

  const content = data.choices?.[0]?.message?.content
  if (!content || !content.trim()) {
    throw new Error('OpenRouter returned an empty response')
  }
  return content
}


