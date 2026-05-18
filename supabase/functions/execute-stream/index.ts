// @ts-nocheck
// execute-stream — Supabase Edge Function (Deno runtime)
//
// Three execution paths for streaming text generation:
//
//   user_byok_cloud  — Key decrypted from Supabase Vault → provider called directly
//                      (key never leaves the server; client only sees SSE tokens)
//
//   user_byok_local  — Client handles this itself via streamLocalProvider().
//                      This edge function is NOT called for local BYOK.
//
//   platform_credit  — User's Chainabit developer token fetched from partner_provisions
//                      → Chainabit's API handles model execution + credit deduction
//
// SSE event format (consumed by walletApiClient stream parsers):
//   event: start → data: { run_id: string }
//   event: token → data: { content: string }
//   event: end   → data: { usage: { input_tokens, output_tokens }, credits_charged: number }
//   event: error → data: { message: string, code: string }
//
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//                   CHAINABIT_API_URL (for platform_credit path)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, errResponse } from '../_shared/cors.ts'

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = 'openai' | 'anthropic' | 'google' | 'mistral'

interface StreamBody {
  provider: Provider
  model: string
  messages: Array<{ role: string; content: string }>
  funding_source: 'user_byok_cloud' | 'platform_credit'
  key_ref_id?: string
  max_tokens?: number
  temperature?: number
}

interface TokenUsage {
  input_tokens: number
  output_tokens: number
}

// ─── SSE helpers ─────────────────────────────────────────────────────────────

function sseHeaders(req: Request): Record<string, string> {
  return {
    ...corsHeaders(req),
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
}

function sseFrame(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// ─── Path 1: user_byok_cloud — vault key → direct provider stream ─────────────

async function resolveVaultKey(
  keyRefId: string,
  userId: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<string> {
  // SECURITY: passes the authenticated caller's auth.uid() so the SQL function
  // can verify ai.keys.lenser_id ownership before reading vault.decrypted_secrets.
  // Without this binding, any authenticated user could decrypt any other user's
  // stored BYOK key by supplying its UUID.
  const { data, error } = await serviceClient.rpc('fn_worker_get_ai_key_secret', {
    p_ai_key_id: keyRefId,
    p_user_id: userId,
  })
  if (error || !data || typeof data !== 'string') {
    throw new Error('Failed to decrypt BYOK key from vault')
  }
  return data as string
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number | undefined,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, messages, max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      stream: true, stream_options: { include_usage: true },
    }),
    signal,
  })
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 200)}`)
  await pumpOpenAIStream(response.body!, signal, emit)
}

async function streamAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number | undefined,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const userMessages = messages.filter((m) => m.role !== 'system')
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model, messages: userMessages, max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      stream: true,
      ...(systemMsg ? { system: systemMsg.content } : {}),
    }),
    signal,
  })
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 200)}`)
  await pumpAnthropicStream(response.body!, signal, emit)
}

async function streamGoogle(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number | undefined,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystem = messages.filter((m) => m.role !== 'system')
  // SECURITY: pass the API key via the x-goog-api-key header, NOT a query
  // parameter. Query-string keys are captured by upstream/intermediary access
  // logs (Deno runtime, edge log aggregators, any reverse proxy).
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: nonSystem.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      ...(systemMessages.length > 0
        ? { system_instruction: { parts: [{ text: systemMessages.map((m) => m.content).join('\n') }] } }
        : {}),
      generationConfig: {
        maxOutputTokens: maxTokens,
        ...(temperature !== undefined ? { temperature } : {}),
      },
    }),
    signal,
  })
  if (!response.ok) throw new Error(`Google ${response.status}: ${(await response.text()).slice(0, 200)}`)
  await pumpGoogleStream(response.body!, signal, emit)
}

async function streamMistral(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number | undefined,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, messages, max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      stream: true,
    }),
    signal,
  })
  if (!response.ok) throw new Error(`Mistral ${response.status}: ${(await response.text()).slice(0, 200)}`)
  // Mistral uses the same SSE format as OpenAI
  await pumpOpenAIStream(response.body!, signal, emit)
}

// ─── Path 2: platform_credit — user's Chainabit token → Chainabit API ────────
//
// Chainabit exposes an OpenAI-compatible streaming endpoint authenticated with
// the user's developer token. Credits are deducted from their Chainabit balance.

async function resolveChainabitToken(
  userId: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<string> {
  const { data, error } = await serviceClient
    .from('partner_provisions')
    .select('token')
    .eq('user_id', userId)
    .eq('partner_name', 'chainabit')
    .maybeSingle<{ token: string | null }>()

  if (error) throw new Error('Failed to look up Chainabit provision')
  if (!data?.token) throw new Error('No Chainabit account connected — connect your Chainabit account to use platform credits')
  return data.token
}

async function streamChainabit(
  chainabitToken: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number | undefined,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const chainabitApiUrl = Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com'
  const url = `${chainabitApiUrl.replace(/\/$/, '')}/api/v1/ai/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${chainabitToken}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Chainabit ${response.status}: ${text.slice(0, 200)}`)
  }

  // Chainabit returns OpenAI-compatible SSE
  await pumpOpenAIStream(response.body!, signal, emit)
}

// ─── SSE pumps ────────────────────────────────────────────────────────────────

async function pumpOpenAIStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const usage: TokenUsage = { input_tokens: 0, output_tokens: 0 }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const dataStr = line.slice(5).trim()
        if (!dataStr || dataStr === '[DONE]') continue
        try {
          const chunk = JSON.parse(dataStr)
          const content = chunk.choices?.[0]?.delta?.content
          if (content) emit('token', { content })
          if (chunk.usage) {
            usage.input_tokens = chunk.usage.prompt_tokens ?? 0
            usage.output_tokens = chunk.usage.completion_tokens ?? 0
          }
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
  emit('end', { usage, credits_charged: 0 })
}

async function pumpAnthropicStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastEvent = ''
  const usage: TokenUsage = { input_tokens: 0, output_tokens: 0 }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) break
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        let dataStr = ''
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) lastEvent = line.slice(6).trim()
          else if (line.startsWith('data:')) dataStr = line.slice(5).trim()
        }
        if (!dataStr) continue
        try {
          const evt = JSON.parse(dataStr)
          if (lastEvent === 'message_start') usage.input_tokens = evt.message?.usage?.input_tokens ?? 0
          else if (lastEvent === 'content_block_delta' && evt.delta?.text) emit('token', { content: evt.delta.text })
          else if (lastEvent === 'message_delta') usage.output_tokens = evt.usage?.output_tokens ?? 0
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
  emit('end', { usage, credits_charged: 0 })
}

async function pumpGoogleStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  emit: (event: string, data: unknown) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const usage: TokenUsage = { input_tokens: 0, output_tokens: 0 }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const dataStr = line.slice(5).trim()
        if (!dataStr || dataStr === '[DONE]') continue
        try {
          const chunk = JSON.parse(dataStr)
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) emit('token', { content: text })
          const meta = chunk.usageMetadata
          if (meta) {
            usage.input_tokens = meta.promptTokenCount ?? 0
            usage.output_tokens = meta.candidatesTokenCount ?? 0
          }
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
  emit('end', { usage, credits_charged: 0 })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) })
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errResponse('unauthenticated', 'Missing Authorization header', 401, req)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return errResponse('unauthenticated', 'Invalid or expired token', 401, req)

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: StreamBody
  try {
    body = await req.json()
  } catch {
    return errResponse('invalid_json', 'Request body must be valid JSON', 400, req)
  }

  const { provider, model, messages, funding_source, key_ref_id, max_tokens, temperature } = body

  const SUPPORTED: Provider[] = ['openai', 'anthropic', 'google', 'mistral']
  if (!SUPPORTED.includes(provider)) return errResponse('unsupported_provider', `Provider "${provider}" not supported`, 400, req)
  if (!model || !messages?.length) return errResponse('missing_fields', 'model and messages are required', 400, req)

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Set up SSE response ────────────────────────────────────────────────────
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const runId = crypto.randomUUID()
  const abortController = new AbortController()
  req.signal.addEventListener('abort', () => abortController.abort())

  const emit = (event: string, data: unknown) => {
    writer.write(sseFrame(event, data)).catch(() => abortController.abort())
  }

  ;(async () => {
    try {
      emit('start', { run_id: runId })

      const maxTokens = max_tokens ?? 4096
      const signal = abortController.signal

      if (funding_source === 'user_byok_cloud') {
        // ── Path 1: BYOK cloud — decrypt from vault, call provider directly ──
        if (!key_ref_id) {
          emit('error', { message: 'key_ref_id is required for BYOK cloud', code: 'byok_key_required' })
          return
        }
        let apiKey: string
        try {
          apiKey = await resolveVaultKey(key_ref_id, user.id, serviceClient)
        } catch (err: unknown) {
          emit('error', { message: err instanceof Error ? err.message : 'Vault key resolution failed', code: 'key_resolution_failed' })
          return
        }

        if (provider === 'openai') await streamOpenAI(apiKey, model, messages, maxTokens, temperature, signal, emit)
        else if (provider === 'anthropic') await streamAnthropic(apiKey, model, messages, maxTokens, temperature, signal, emit)
        else if (provider === 'google') await streamGoogle(apiKey, model, messages, maxTokens, temperature, signal, emit)
        else if (provider === 'mistral') await streamMistral(apiKey, model, messages, maxTokens, temperature, signal, emit)

      } else {
        // ── Path 2: platform_credit — user's Chainabit token ─────────────────
        let chainabitToken: string
        try {
          chainabitToken = await resolveChainabitToken(user.id, serviceClient)
        } catch (err: unknown) {
          emit('error', { message: err instanceof Error ? err.message : 'Chainabit account not connected', code: 'chainabit_not_connected' })
          return
        }

        await streamChainabit(chainabitToken, model, messages, maxTokens, temperature, signal, emit)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      emit('error', { message: err instanceof Error ? err.message : 'Execution failed', code: 'provider_error' })
    } finally {
      writer.close().catch(() => {})
    }
  })()

  return new Response(readable, { status: 200, headers: sseHeaders(req) })
})
