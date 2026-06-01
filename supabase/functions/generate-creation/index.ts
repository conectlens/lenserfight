// @ts-nocheck
// generate-creation — Supabase Edge Function (Deno runtime)
//
// Generates structured AI output (lens, workflow, or battle) for the creation flows.
// Non-streaming: returns JSON { ok, output, mode } or { ok, error }.
//
// Funding source routing:
//   platform_credit  — Chainabit token resolved from auth.identities
//   user_byok_cloud  — BYOK key decrypted from Supabase Vault via fn_worker_get_ai_key_secret
//   user_byok_local  — REJECTED (client must handle local BYOK directly via gateway loopback)
//
// Production controls:
//   - Auth check: caller's JWT must match profile_id
//   - Prompt validation: max 2000 chars
//   - Timeout: 30s AbortSignal
//   - Rate limiting: 10 req/min per user (sliding window via KV metadata in auth.identities or simple in-memory for now)
//   - Provider error normalization
//   - No recursive AI calls, no unbounded retries

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, jsonResponse, errResponse } from '../_shared/cors.ts'
import {
  resolveChainabitToken,
  ProviderNotConnectedError,
  TokenExpiredError,
} from '../_shared/provider-token.ts'
import { lookupModel } from '../_shared/providers/model-registry.ts'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PROMPT_LENGTH = 2000
const TIMEOUT_MS = 30_000
const MAX_OUTPUT_TOKENS = 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerationType = 'lens' | 'workflow' | 'battle' | 'lens_params'
type FundingSource = 'platform_credit' | 'user_byok_cloud'

interface GenerateCreationRequest {
  generation_type: GenerationType
  prompt: string | null
  profile_id: string
  context: Record<string, unknown>
  funding_source: FundingSource
  key_ref_id?: string | null
  provider_key: string
  model_key: string
}

// ─── In-memory rate limiter (per user, sliding window) ───────────────────────
// Sufficient for edge function instances. For multi-region production, use Deno KV.

const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  )
  if (timestamps.length >= RATE_LIMIT_MAX) return false
  timestamps.push(now)
  rateLimitMap.set(userId, timestamps)
  return true
}

// ─── Prompt / message builders ────────────────────────────────────────────────

function buildLensParamsMessages(prompt: string | null, context: Record<string, unknown>) {
  const params = Array.isArray(context.params) ? context.params as Array<{ label: string; type: string; options?: string[] }> : []
  const titleLine = typeof context.lensTitle === 'string' && context.lensTitle ? `Lens: "${context.lensTitle}"\n` : ''
  const contentLine = typeof context.lensContent === 'string' && context.lensContent
    ? `Instructions: "${context.lensContent.replace(/\n+/g, ' ').slice(0, 400)}"\n`
    : ''
  const paramLines = params.map((p) => {
    const opts = Array.isArray(p.options) && p.options.length ? `, options: ${p.options.join(' | ')}` : ''
    return `- "${p.label}" (${p.type}${opts})`
  }).join('\n')

  const system = `You are a LenserFight lens parameter value generator.
Generate appropriate values for the given parameters based on the lens context.
Respond ONLY with a JSON object — no prose, no markdown fences, no explanation:
{"param_label": value, ...}

Type rules:
- text / textarea / url / json → string
- number / integer / float / decimal → number
- boolean → true or false
- select → one of the listed options exactly
- multiselect / array → array of strings
- file / files / connector → omit the key entirely`

  const instruction = prompt?.trim()
    ? `User instruction: ${prompt.slice(0, MAX_PROMPT_LENGTH)}`
    : 'Generate sensible default values that illustrate how this lens should be used.'

  return [
    { role: 'system', content: system },
    { role: 'user', content: `${titleLine}${contentLine}\nParameters:\n${paramLines}\n\n${instruction}` },
  ]
}

function buildLensMessages(prompt: string | null, context: Record<string, unknown>) {
  const system = `You are an expert LenserFight lens author.
A lens is a reusable AI instruction template written in markdown.
Lenses use [[variable_name]] double-bracket syntax to declare dynamic parameters.

Respond ONLY with a JSON object — no prose, no markdown fences, no explanation:
{
  "title": "Short, descriptive lens title (max 80 chars)",
  "content": "Full lens markdown body with [[variable]] params where appropriate (min 100 chars)",
  "description": "One-sentence description of what this lens does (max 200 chars)",
  "suggestedTagSlugs": ["tag-slug-1", "tag-slug-2"],
  "params": [{"label": "variable_name"}]
}`

  const persona = typeof context.userPersona === 'string' ? `\nUser persona: ${context.userPersona.slice(0, 200)}` : ''
  const tags = Array.isArray(context.userTagSlugs) && context.userTagSlugs.length
    ? `\nUser's usual tags: ${(context.userTagSlugs as string[]).slice(0, 10).join(', ')}`
    : ''

  const userContent = prompt?.trim()
    ? `Create a lens for:\n${prompt.slice(0, MAX_PROMPT_LENGTH)}${persona}${tags}`
    : `Suggest a useful, practical lens that would help this user.\n${persona}${tags}\nDefault to a high-value productivity or writing lens if no context is available.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ]
}

function buildWorkflowMessages(prompt: string | null, context: Record<string, unknown>) {
  const lensIds = Array.isArray(context.availableLensIds)
    ? (context.availableLensIds as string[]).slice(0, 20).join(', ')
    : '(none yet)'

  const system = `You are an expert LenserFight workflow designer.
Available lens IDs: ${lensIds}
You MUST only reference IDs from this list in suggestedLensIds.

Respond ONLY with a JSON object:
{
  "title": "Concise workflow title (max 80 chars)",
  "description": "One-sentence description (max 200 chars)",
  "suggestedLensIds": ["lens-uuid-1", "lens-uuid-2"]
}

Rules: suggestedLensIds must be a subset of available IDs. Order by execution sequence. Use [] if none fit.`

  const persona = typeof context.userPersona === 'string' ? `\nUser persona: ${context.userPersona.slice(0, 200)}` : ''
  const userContent = prompt?.trim()
    ? `Create a workflow for:\n${prompt.slice(0, MAX_PROMPT_LENGTH)}${persona}`
    : `Suggest a practical workflow that connects these lenses in a useful way.${persona}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ]
}

// Battle "create instructions" sublayer.
// IMPORTANT: keep behaviourally equivalent to BATTLE_SYSTEM / buildBattle*Messages
// in libs/infra/ai-creation/src/lib/creation-prompts.ts (the TS copy of this sublayer).
function buildBattleMessages(prompt: string | null, context: Record<string, unknown>) {
  const system = `You are an expert LenserFight battle designer.
A battle pits AI models (or humans) against each other on a single shared task, judged by the community or an AI judge.

Respond ONLY with a JSON object — no prose, no markdown fences, no explanation:
{
  "title": "Concise, exciting battle title (max 80 chars)",
  "task_prompt": "The exact challenge every contender receives (min 30 chars). Self-contained, unambiguous, and fair.",
  "suggestedTaskSource": "lens" | "workflow" | "challenge",
  "suggestedContenderStructure": "ai_vs_ai" | "human_vs_ai" | "human_vs_human",
  "suggestedJudgingMode": "community_vote" | "ai_judge" | "rubric_score" | "auto_score",
  "suggestedChallengeType": null
}

Rules:
- task_prompt must be an apples-to-apples instruction every contender can answer fairly.
- Default to suggestedTaskSource:"challenge", suggestedContenderStructure:"ai_vs_ai", suggestedJudgingMode:"community_vote" unless the request clearly implies otherwise.
- Set suggestedChallengeType to a short lowercase slug (e.g. "writing", "math") ONLY when suggestedTaskSource is "challenge"; otherwise null.
- Use only the exact enum values shown above — never invent new ones.`

  const persona = typeof context.userPersona === 'string' ? `\nUser persona: ${context.userPersona.slice(0, 200)}` : ''
  const lensIds = Array.isArray(context.availableLensIds) && context.availableLensIds.length
    ? `\nAvailable lens IDs: ${(context.availableLensIds as string[]).slice(0, 20).join(', ')}`
    : ''
  const workflowIds = Array.isArray(context.availableWorkflowIds) && context.availableWorkflowIds.length
    ? `\nAvailable workflow IDs: ${(context.availableWorkflowIds as string[]).slice(0, 20).join(', ')}`
    : ''
  const userContent = prompt?.trim()
    ? `Design a battle for:\n${prompt.slice(0, MAX_PROMPT_LENGTH)}${lensIds}${workflowIds}${persona}`
    : `Suggest an engaging, fair battle that would be fun to run and judge.${persona}\nDefault to a high-quality general writing challenge if no context is available.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ]
}

// ─── Output parser ────────────────────────────────────────────────────────────

function extractJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw.trim())
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('no JSON object found in AI response')
  }
}

function parseLensOutput(raw: string) {
  const obj = extractJson(raw)
  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  const content = typeof obj.content === 'string' ? obj.content.trim() : ''
  if (!title) throw new Error('missing title in AI response')
  if (content.length < 10) throw new Error('content too short in AI response')
  const description = typeof obj.description === 'string' ? obj.description.slice(0, 300).trim() : ''
  const suggestedTagSlugs = Array.isArray(obj.suggestedTagSlugs)
    ? (obj.suggestedTagSlugs as string[]).filter((t) => typeof t === 'string').slice(0, 10)
    : []
  const fromContent = [...content.matchAll(/\[\[(\w+)\]\]/g)].map((m) => m[1])
  const seen = new Set<string>()
  const params: Array<{ label: string }> = []
  for (const label of fromContent) {
    if (!seen.has(label)) { seen.add(label); params.push({ label }) }
  }
  return { type: 'lens' as const, result: { title, content, description, suggestedTagSlugs, params } }
}

function parseWorkflowOutput(raw: string) {
  const obj = extractJson(raw)
  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  if (!title) throw new Error('missing title in AI response')
  const description = typeof obj.description === 'string' ? obj.description.slice(0, 300).trim() : ''
  const suggestedLensIds = Array.isArray(obj.suggestedLensIds)
    ? (obj.suggestedLensIds as string[]).filter((id) => typeof id === 'string').slice(0, 20)
    : []
  return { type: 'workflow' as const, result: { title, description, suggestedLensIds } }
}

// Allow-lists mirror @lenserfight/domain/battle-governance enums. A hallucinated
// value is dropped to undefined rather than propagated to the wizard.
const BATTLE_TASK_SOURCES = ['lens', 'workflow', 'challenge']
const BATTLE_CONTENDER_STRUCTURES = ['ai_vs_ai', 'human_vs_human', 'human_vs_ai']
const BATTLE_JUDGING_MODES = ['community_vote', 'ai_judge', 'rubric_score', 'auto_score']

function pickAllowed(value: unknown, allowed: string[]): string | undefined {
  return typeof value === 'string' && allowed.includes(value) ? value : undefined
}

function parseLensParamsOutput(raw: string) {
  const obj = extractJson(raw)
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('lens_params response must be a plain JSON object')
  }
  return { type: 'lens_params' as const, result: obj }
}

function parseBattleOutput(raw: string) {
  const obj = extractJson(raw)
  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  const task_prompt = typeof obj.task_prompt === 'string' ? obj.task_prompt.trim() : ''
  if (!title) throw new Error('missing title in AI response')
  if (task_prompt.length < 10) throw new Error('task_prompt too short in AI response')

  const suggestedTaskSource = pickAllowed(obj.suggestedTaskSource, BATTLE_TASK_SOURCES)
  const suggestedContenderStructure = pickAllowed(obj.suggestedContenderStructure, BATTLE_CONTENDER_STRUCTURES)
  const suggestedJudgingMode = pickAllowed(obj.suggestedJudgingMode, BATTLE_JUDGING_MODES)
  const suggestedChallengeType =
    suggestedTaskSource === 'challenge' && typeof obj.suggestedChallengeType === 'string'
      ? obj.suggestedChallengeType.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) || null
      : null

  return {
    type: 'battle' as const,
    result: {
      title,
      task_prompt,
      suggestedTaskSource,
      suggestedContenderStructure,
      suggestedJudgingMode,
      suggestedChallengeType,
    },
  }
}

// ─── Provider caller ──────────────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.7 }),
    signal,
  })
  if (!res.ok) throw new Error(`openai:${res.status}:${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const userMessages = messages.filter((m) => m.role !== 'system')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model, messages: userMessages, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.7,
      ...(systemMsg ? { system: systemMsg.content } : {}),
    }),
    signal,
  })
  if (!res.ok) throw new Error(`anthropic:${res.status}:${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

async function callGoogle(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
): Promise<string> {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystem = messages.filter((m) => m.role !== 'system')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: nonSystem.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      ...(systemMessages.length > 0
        ? { system_instruction: { parts: [{ text: systemMessages.map((m) => m.content).join('\n') }] } }
        : {}),
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.7 },
    }),
    signal,
  })
  if (!res.ok) throw new Error(`google:${res.status}:${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function callMistral(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.7 }),
    signal,
  })
  if (!res.ok) throw new Error(`mistral:${res.status}:${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callChainabit(
  chainabitToken: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
): Promise<string> {
  const apiUrl = (Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com').replace(/\/$/, '')
  const res = await fetch(`${apiUrl}/api/v1/ai/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chainabitToken}` },
    body: JSON.stringify({ model, messages, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.7 }),
    signal,
  })
  if (!res.ok) throw new Error(`chainabit:${res.status}:${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function dispatchProvider(
  providerKey: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
  isChainabit = false,
): Promise<string> {
  if (isChainabit) return callChainabit(apiKey, model, messages, signal)
  switch (providerKey) {
    case 'openai':    return callOpenAI(apiKey, model, messages, signal)
    case 'anthropic': return callAnthropic(apiKey, model, messages, signal)
    case 'google':    return callGoogle(apiKey, model, messages, signal)
    case 'mistral':   return callMistral(apiKey, model, messages, signal)
    default:          return callOpenAI(apiKey, model, messages, signal)
  }
}

// ─── Vault key resolver ───────────────────────────────────────────────────────

async function resolveVaultKey(
  keyRefId: string,
  userId: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<string> {
  const { data, error } = await serviceClient.rpc('fn_worker_get_ai_key_secret', {
    p_ai_key_id: keyRefId,
    p_user_id: userId,
  })
  if (error || !data || typeof data !== 'string') {
    throw new Error('Failed to decrypt BYOK key from vault')
  }
  return data as string
}

// ─── Error normalizer ─────────────────────────────────────────────────────────

function normalizeError(err: unknown): { code: string; message: string; retryAfterMs?: number } {
  if (!(err instanceof Error)) {
    return { code: 'PROVIDER_ERROR', message: 'An unexpected error occurred.' }
  }
  const msg = err.message
  if (err.name === 'AbortError' || err.name === 'TimeoutError') {
    return { code: 'TIMEOUT', message: `Request timed out after ${TIMEOUT_MS / 1000}s.` }
  }
  if (msg.includes('rate') || msg.includes('429')) {
    return { code: 'RATE_LIMITED', message: 'Provider rate limit hit. Wait a moment and try again.', retryAfterMs: 60000 }
  }
  if (msg.includes('quota') || msg.includes('insufficient') || msg.includes('credit')) {
    return { code: 'CREDIT_EXHAUSTED', message: 'Credits or quota exhausted for the selected funding source.' }
  }
  if (msg.includes('JSON') || msg.includes('parse') || msg.includes('missing title') || msg.includes('no JSON')) {
    return { code: 'PARSE_ERROR', message: 'The AI returned an unexpected format. Please try again.' }
  }
  return { code: 'PROVIDER_ERROR', message: msg.slice(0, 300) }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  if (req.method !== 'POST') {
    return errResponse('METHOD_NOT_ALLOWED', 'POST required', 405, req)
  }

  // 1. Parse body
  let body: GenerateCreationRequest
  try {
    body = await req.json()
  } catch {
    return errResponse('VALIDATION_ERROR', 'Invalid JSON body', 400, req)
  }

  const { generation_type, prompt, profile_id, context, funding_source, key_ref_id, provider_key, model_key } = body

  // 2. Validate required fields
  if (!generation_type || !['lens', 'workflow', 'battle', 'lens_params'].includes(generation_type)) {
    return errResponse('VALIDATION_ERROR', 'generation_type must be "lens", "workflow", "battle", or "lens_params"', 400, req)
  }
  if (!profile_id) {
    return errResponse('VALIDATION_ERROR', 'profile_id is required', 400, req)
  }
  if (funding_source === 'user_byok_local') {
    return errResponse('LOCAL_BYOK_SERVER_REJECTED', 'Local BYOK must be handled client-side via the gateway loopback.', 400, req)
  }
  if (!['platform_credit', 'user_byok_cloud'].includes(funding_source)) {
    return errResponse('VALIDATION_ERROR', 'Invalid funding_source', 400, req)
  }

  // 3. Validate model kind — generate-creation is text-only (lens/workflow JSON).
  // Image/video/audio models (dall-e-4, imagen-4, veo-3, …) have no chat
  // completions endpoint; sending them here produces a provider 404 and burns
  // credits. Media generation must be handled by trigger-execution.
  if (model_key) {
    const modelDescriptor = lookupModel(model_key)
    if (modelDescriptor && modelDescriptor.kind !== 'text') {
      return errResponse(
        'VALIDATION_ERROR',
        `Model "${model_key}" produces ${modelDescriptor.kind} output. generate-creation only accepts text models; use trigger-execution for media generation.`,
        400, req,
      )
    }
  }

  // 4. Validate prompt length (server-side defence-in-depth)
  if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
    return errResponse('PROMPT_TOO_LONG', `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters.`, 400, req)
  }

  // 4. Authenticate
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errResponse('UNAUTHORIZED', 'Missing Bearer token', 401, req)
  }
  const jwt = authHeader.slice(7)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const serviceClient = createClient(supabaseUrl, serviceKey)

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData?.user) {
    return errResponse('UNAUTHORIZED', 'Invalid or expired session', 401, req)
  }
  const userId = authData.user.id

  // 5. Verify profile ownership (profile_id must equal the authenticated user)
  if (profile_id !== userId) {
    return errResponse('UNAUTHORIZED', 'profile_id does not match authenticated user', 403, req)
  }

  // 6. Rate limit check (per user, sliding 60s window)
  if (!checkRateLimit(userId)) {
    return jsonResponse(
      { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a minute.', retryAfterMs: RATE_LIMIT_WINDOW_MS } },
      429, req,
    )
  }

  // 7. Resolve API key
  let apiKey: string
  let isChainabit = false

  try {
    if (funding_source === 'user_byok_cloud') {
      if (!key_ref_id) {
        return errResponse('VALIDATION_ERROR', 'key_ref_id required for user_byok_cloud', 400, req)
      }
      apiKey = await resolveVaultKey(key_ref_id, userId, serviceClient)
    } else {
      // platform_credit — resolve Chainabit token
      const refreshConfig = {
        apiUrl: Deno.env.get('CHAINABIT_API_URL') ?? 'https://api.chainabit.com',
        clientId: Deno.env.get('CHAINABIT_CLIENT_ID') ?? '',
        clientSecret: Deno.env.get('CHAINABIT_CLIENT_SECRET') ?? '',
      }
      const { accessToken } = await resolveChainabitToken(userId, serviceClient, refreshConfig)
      apiKey = accessToken
      isChainabit = true
    }
  } catch (err) {
    if (err instanceof ProviderNotConnectedError) {
      return jsonResponse({ ok: false, error: { code: 'CREDIT_EXHAUSTED', message: 'No Chainabit account connected. Connect your account to use platform credits.' } }, 402, req)
    }
    if (err instanceof TokenExpiredError) {
      return jsonResponse({ ok: false, error: { code: 'CREDIT_EXHAUSTED', message: 'Chainabit token expired. Reconnect your Chainabit account.' } }, 402, req)
    }
    return jsonResponse({ ok: false, error: normalizeError(err) }, 500, req)
  }

  // 8. Build messages
  const ctx = (context ?? {}) as Record<string, unknown>
  const messages = generation_type === 'lens_params'
    ? buildLensParamsMessages(prompt, ctx)
    : generation_type === 'lens'
      ? buildLensMessages(prompt, ctx)
      : generation_type === 'battle'
        ? buildBattleMessages(prompt, ctx)
        : buildWorkflowMessages(prompt, ctx)

  // 9. Call provider with timeout
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  let rawContent: string

  try {
    rawContent = await dispatchProvider(
      provider_key ?? 'openai',
      apiKey,
      model_key ?? 'gpt-4o-mini',
      messages,
      signal,
      isChainabit,
    )
  } catch (err) {
    const normalized = normalizeError(err)
    const status = normalized.code === 'TIMEOUT' ? 504
      : normalized.code === 'RATE_LIMITED' ? 429
      : normalized.code === 'CREDIT_EXHAUSTED' ? 402
      : 502
    return jsonResponse({ ok: false, error: normalized }, status, req)
  }

  // 10. Parse structured output
  try {
    const output = generation_type === 'lens_params'
      ? parseLensParamsOutput(rawContent)
      : generation_type === 'lens'
        ? parseLensOutput(rawContent)
        : generation_type === 'battle'
          ? parseBattleOutput(rawContent)
          : parseWorkflowOutput(rawContent)

    const mode: 'prompted' | 'recommendation' = prompt?.trim() ? 'prompted' : 'recommendation'
    return jsonResponse({ ok: true, output, mode }, 200, req)
  } catch (err) {
    return jsonResponse(
      { ok: false, error: { code: 'PARSE_ERROR', message: err instanceof Error ? err.message : 'Failed to parse AI output.' } },
      422, req,
    )
  }
})
