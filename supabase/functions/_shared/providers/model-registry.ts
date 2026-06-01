// @ts-nocheck
// Deno-side mirror of libs/providers/src/lib/model-registry.ts
//
// Edge functions can't `import` from node-package source (no bundler), so we
// keep a small Deno module here with the same shape and identical row data.
// When the canonical TS registry changes, update both copies — until we ship
// a Deno-publishable provider package, this is the source of truth on the
// edge side.

export interface ModelDescriptor {
  key: string
  provider:
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'mistral'
    | 'ollama'
    | 'stability'
    | 'elevenlabs'
    | 'kling'
    | 'suno'
    | 'midjourney'
    | 'fal'
  wireModel: string
  kind: 'text' | 'image' | 'video' | 'audio' | 'music'
}

const MODELS: ModelDescriptor[] = [
  // OpenAI text — gpt-5.4/mini/nano are real GA models; gpt-5.4-pro/gpt-5.2
  // are LF-only keys that alias to the closest tier. gpt-4o/gpt-4o-mini kept
  // as self-references (still accepted by OpenAI, superseded by gpt-5.x).
  { key: 'gpt-5.4-pro',  provider: 'openai', wireModel: 'gpt-5.4',      kind: 'text' },
  { key: 'gpt-5.4',      provider: 'openai', wireModel: 'gpt-5.4',      kind: 'text' },
  { key: 'gpt-5.4-mini', provider: 'openai', wireModel: 'gpt-5.4-mini', kind: 'text' },
  { key: 'gpt-5.4-nano', provider: 'openai', wireModel: 'gpt-5.4-nano', kind: 'text' },
  { key: 'gpt-5.2',      provider: 'openai', wireModel: 'gpt-5.4',      kind: 'text' },
  { key: 'gpt-4o',       provider: 'openai', wireModel: 'gpt-4o',       kind: 'text' },
  { key: 'gpt-4o-mini',  provider: 'openai', wireModel: 'gpt-4o-mini',  kind: 'text' },

  // OpenAI image — gpt-image-1 deprecated; gpt-image-2 is current.
  { key: 'dall-e-4',    provider: 'openai', wireModel: 'gpt-image-2', kind: 'image' },
  { key: 'gpt-image-1', provider: 'openai', wireModel: 'gpt-image-2', kind: 'image' },
  { key: 'dall-e-3',    provider: 'openai', wireModel: 'dall-e-3',    kind: 'image' },
  { key: 'dall-e-2',    provider: 'openai', wireModel: 'dall-e-2',    kind: 'image' },

  // OpenAI video
  { key: 'sora-2.0', provider: 'openai', wireModel: 'sora-2', kind: 'video' },
  { key: 'sora-2',   provider: 'openai', wireModel: 'sora-2', kind: 'video' },

  // Anthropic — claude-sonnet-4/claude-opus-4 (20250514 dated) are deprecated
  // and retire June 15 2026. All other wire IDs are current.
  { key: 'claude-opus-4-6',   provider: 'anthropic', wireModel: 'claude-opus-4-6',             kind: 'text' },
  { key: 'claude-opus-4',     provider: 'anthropic', wireModel: 'claude-opus-4-20250514',       kind: 'text' },
  { key: 'claude-sonnet-4-6', provider: 'anthropic', wireModel: 'claude-sonnet-4-6',            kind: 'text' },
  { key: 'claude-sonnet-4-5', provider: 'anthropic', wireModel: 'claude-sonnet-4-5-20250929',   kind: 'text' },
  { key: 'claude-sonnet-4-0', provider: 'anthropic', wireModel: 'claude-sonnet-4-20250514',     kind: 'text' },
  { key: 'claude-haiku-4-5',  provider: 'anthropic', wireModel: 'claude-haiku-4-5-20251001',    kind: 'text' },
  { key: 'claude-haiku-3-5',  provider: 'anthropic', wireModel: 'claude-3-5-haiku-20241022',    kind: 'text' },

  // Google text — gemini-3.1-pro-preview / gemini-3-flash-preview are real
  // Google API model IDs (current previews). gemini-3-pro-preview is deprecated
  // by Google; redirect to gemini-2.5-pro. gemini-3.1-flash-lite-preview is
  // deprecated; redirect to the stable gemini-3.1-flash-lite.
  { key: 'gemini-3.1-pro-preview',        provider: 'google', wireModel: 'gemini-3.1-pro-preview', kind: 'text' },
  { key: 'gemini-3-pro-preview',          provider: 'google', wireModel: 'gemini-2.5-pro',         kind: 'text' },
  { key: 'gemini-2.5-pro',                provider: 'google', wireModel: 'gemini-2.5-pro',         kind: 'text' },
  { key: 'gemini-3-flash-preview',        provider: 'google', wireModel: 'gemini-3-flash-preview', kind: 'text' },
  { key: 'gemini-2.5-flash',              provider: 'google', wireModel: 'gemini-2.5-flash',       kind: 'text' },
  { key: 'gemini-3.1-flash-lite-preview', provider: 'google', wireModel: 'gemini-3.1-flash-lite',  kind: 'text' },
  { key: 'gemini-2.5-flash-lite',         provider: 'google', wireModel: 'gemini-2.5-flash-lite',  kind: 'text' },

  // Google media — Imagen 3 shut down June 2025. Imagen 4 GA only.
  // veo-3.0-generate-001 is the stable GA Veo 3; veo-2.0-generate-001 is legacy.
  { key: 'imagen-4', provider: 'google', wireModel: 'imagen-4.0-generate-001', kind: 'image' },
  // Backward-compat alias: old preview wire name redirects to GA model.
  { key: 'imagen-4.0-generate-preview-06-06', provider: 'google', wireModel: 'imagen-4.0-generate-001', kind: 'image' },
  { key: 'veo-3',    provider: 'google', wireModel: 'veo-3.0-generate-001',    kind: 'video' },
  { key: 'veo-2',    provider: 'google', wireModel: 'veo-2.0-generate-001',    kind: 'video' },
  { key: 'lyria-2',  provider: 'google', wireModel: 'lyria-002',               kind: 'music' },

  // Mistral — magistral-medium-2509 / magistral-small-2509 deprecated; replaced
  // by mistral-medium-3.5 and mistral-small-4 respectively.
  { key: 'mistral-large-3',      provider: 'mistral', wireModel: 'mistral-large-3-25-12',    kind: 'text' },
  { key: 'magistral-medium-1.2', provider: 'mistral', wireModel: 'mistral-medium-3-5-26-04', kind: 'text' },
  { key: 'magistral-small-1.2',  provider: 'mistral', wireModel: 'mistral-small-4-0-26-03',  kind: 'text' },

  // Stability
  { key: 'stable-diffusion-4', provider: 'stability', wireModel: 'sd3.5-large', kind: 'image' },
  { key: 'stable-image-core',  provider: 'stability', wireModel: 'core',        kind: 'image' },
  { key: 'stable-image-ultra', provider: 'stability', wireModel: 'ultra',       kind: 'image' },

  // ElevenLabs
  { key: 'elevenlabs-v4',          provider: 'elevenlabs', wireModel: 'eleven_multilingual_v2', kind: 'audio' },
  { key: 'eleven_multilingual_v2', provider: 'elevenlabs', wireModel: 'eleven_multilingual_v2', kind: 'audio' },

  // Kling / Suno
  { key: 'kling-2.0', provider: 'kling', wireModel: 'kling-v2-master', kind: 'video' },
  { key: 'suno-v5',   provider: 'suno',  wireModel: 'chirp-v4',        kind: 'music' },
]

const BY_KEY = new Map<string, ModelDescriptor>(MODELS.map((m) => [m.key, m]))

export function lookupModel(modelKey: string): ModelDescriptor | null {
  const direct = BY_KEY.get(modelKey)
  if (direct) return direct
  for (const m of MODELS) {
    if (m.wireModel === modelKey) return m
  }
  return null
}

export function resolveWireModel(modelKey: string): string {
  return lookupModel(modelKey)?.wireModel ?? modelKey
}

export function detectProvider(modelKey: string): ModelDescriptor['provider'] | null {
  return lookupModel(modelKey)?.provider ?? null
}
