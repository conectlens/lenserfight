/**
 * LenserFight model registry — single source of truth that maps the
 * LenserFight canonical key (used in lens versions, seeds, docs) to:
 *  - the real provider model name that goes on the wire, and
 *  - the provider key used to route to the correct adapter.
 *
 * Why this exists: LenserFight's `ai.models` table and `docs/en/reference/ai-models.md`
 * carry forward-looking model keys (e.g. `dall-e-4`, `imagen-4`, `veo-3`,
 * `gpt-5.4-pro`). Real provider APIs don't accept those names. Sending the
 * canonical key verbatim guarantees 404s. This registry translates at the seam
 * between domain and transport, so the rest of the stack can keep using the
 * canonical key.
 *
 * GRASP — *Information Expert* + *Pure Fabrication*. One module owns model
 * identity; every adapter and the edge function read from it instead of
 * hard-coding `startsWith('dall-e')` checks at random callsites (which is the
 * pattern this replaces — see trigger-execution/index.ts).
 *
 * Adding a model is one entry per row; nothing else changes.
 */

import type { Provider, GenerativeMediaProvider } from './types'

export type AnyProvider = Provider | GenerativeMediaProvider

export interface ModelDescriptor {
  /** LenserFight canonical key — what callers / DB rows pass in. */
  key: string
  /** Provider routing key — picks the adapter. */
  provider: AnyProvider
  /**
   * Real model identifier sent to the provider's HTTP API. When equal to `key`
   * the canonical name is also the wire name. When different, this is an alias.
   */
  wireModel: string
  /** Output kind this model produces — drives modality validation. */
  kind: 'text' | 'image' | 'video' | 'audio' | 'music'
}

/**
 * Resolves LenserFight canonical keys → real provider identifiers.
 *
 * Verified against:
 *   - https://platform.openai.com/docs/models
 *   - https://docs.anthropic.com/en/docs/about-claude/models/overview
 *   - https://ai.google.dev/gemini-api/docs/models
 *   - https://platform.openai.com/docs/api-reference/images / videos
 *   - https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview
 *   - https://docs.stability.ai/docs/api-reference
 *   - https://elevenlabs.io/docs/api-reference/text-to-speech
 *   - https://docs.klingai.com / https://suno.com
 *
 * Entries are listed by provider for readability. Adding a model = one row.
 */
const MODELS: ModelDescriptor[] = [
  // ── OpenAI text ──────────────────────────────────────────────────────────
  // LF's forward-looking gpt-5.4-* keys all alias to the most capable current
  // OpenAI text model so the wire format stays valid. When real gpt-5 ships,
  // update `wireModel` in one place.
  { key: 'gpt-5.4-pro',  provider: 'openai', wireModel: 'gpt-4o',      kind: 'text' },
  { key: 'gpt-5.4',      provider: 'openai', wireModel: 'gpt-4o',      kind: 'text' },
  { key: 'gpt-5.4-mini', provider: 'openai', wireModel: 'gpt-4o-mini', kind: 'text' },
  { key: 'gpt-5.4-nano', provider: 'openai', wireModel: 'gpt-4o-mini', kind: 'text' },
  { key: 'gpt-5.2',      provider: 'openai', wireModel: 'gpt-4o',      kind: 'text' },
  { key: 'gpt-4o',       provider: 'openai', wireModel: 'gpt-4o',      kind: 'text' },
  { key: 'gpt-4o-mini',  provider: 'openai', wireModel: 'gpt-4o-mini', kind: 'text' },

  // ── OpenAI image ─────────────────────────────────────────────────────────
  // dall-e-4 is LenserFight's forward key for the next-gen image model;
  // OpenAI ships gpt-image-1 today.
  { key: 'dall-e-4',    provider: 'openai', wireModel: 'gpt-image-1', kind: 'image' },
  { key: 'gpt-image-1', provider: 'openai', wireModel: 'gpt-image-1', kind: 'image' },
  { key: 'dall-e-3',    provider: 'openai', wireModel: 'dall-e-3',    kind: 'image' },
  { key: 'dall-e-2',    provider: 'openai', wireModel: 'dall-e-2',    kind: 'image' },

  // ── OpenAI video ─────────────────────────────────────────────────────────
  { key: 'sora-2.0', provider: 'openai', wireModel: 'sora-2', kind: 'video' },
  { key: 'sora-2',   provider: 'openai', wireModel: 'sora-2', kind: 'video' },

  // ── Anthropic ────────────────────────────────────────────────────────────
  // claude-*-4-* keys alias to Anthropic's current 3.5/3.7-series names.
  { key: 'claude-opus-4-6',   provider: 'anthropic', wireModel: 'claude-opus-4-1-20250805',     kind: 'text' },
  { key: 'claude-opus-4',     provider: 'anthropic', wireModel: 'claude-opus-4-20250514',       kind: 'text' },
  { key: 'claude-sonnet-4-6', provider: 'anthropic', wireModel: 'claude-sonnet-4-5-20250929',   kind: 'text' },
  { key: 'claude-sonnet-4-5', provider: 'anthropic', wireModel: 'claude-sonnet-4-5-20250929',   kind: 'text' },
  { key: 'claude-sonnet-4-0', provider: 'anthropic', wireModel: 'claude-sonnet-4-20250514',     kind: 'text' },
  { key: 'claude-haiku-4-5',  provider: 'anthropic', wireModel: 'claude-haiku-4-5-20251001',    kind: 'text' },
  { key: 'claude-haiku-3-5',  provider: 'anthropic', wireModel: 'claude-3-5-haiku-20241022',    kind: 'text' },

  // ── Google text (Gemini) ─────────────────────────────────────────────────
  { key: 'gemini-3.1-pro-preview',        provider: 'google', wireModel: 'gemini-2.5-pro',        kind: 'text' },
  { key: 'gemini-3-pro-preview',          provider: 'google', wireModel: 'gemini-2.5-pro',        kind: 'text' },
  { key: 'gemini-2.5-pro',                provider: 'google', wireModel: 'gemini-2.5-pro',        kind: 'text' },
  { key: 'gemini-3-flash-preview',        provider: 'google', wireModel: 'gemini-2.5-flash',      kind: 'text' },
  { key: 'gemini-2.5-flash',              provider: 'google', wireModel: 'gemini-2.5-flash',      kind: 'text' },
  { key: 'gemini-3.1-flash-lite-preview', provider: 'google', wireModel: 'gemini-2.5-flash-lite', kind: 'text' },
  { key: 'gemini-2.5-flash-lite',         provider: 'google', wireModel: 'gemini-2.5-flash-lite', kind: 'text' },

  // ── Google image (Imagen) ────────────────────────────────────────────────
  { key: 'imagen-4', provider: 'google', wireModel: 'imagen-3.0-generate-002',      kind: 'image' },
  { key: 'imagen-3', provider: 'google', wireModel: 'imagen-3.0-generate-002',      kind: 'image' },
  { key: 'imagen-3-fast', provider: 'google', wireModel: 'imagen-3.0-fast-generate-001', kind: 'image' },

  // ── Google video (Veo) ───────────────────────────────────────────────────
  { key: 'veo-3', provider: 'google', wireModel: 'veo-2.0-generate-001', kind: 'video' },
  { key: 'veo-2', provider: 'google', wireModel: 'veo-2.0-generate-001', kind: 'video' },

  // ── Google audio / music (Lyria) ─────────────────────────────────────────
  { key: 'lyria-2', provider: 'google', wireModel: 'lyria-002', kind: 'music' },

  // ── Mistral ──────────────────────────────────────────────────────────────
  { key: 'mistral-large-3',     provider: 'mistral', wireModel: 'mistral-large-latest',       kind: 'text' },
  { key: 'magistral-medium-1.2', provider: 'mistral', wireModel: 'magistral-medium-2509',     kind: 'text' },
  { key: 'magistral-small-1.2',  provider: 'mistral', wireModel: 'magistral-small-2509',      kind: 'text' },

  // ── Stability (image) ────────────────────────────────────────────────────
  { key: 'stable-diffusion-4', provider: 'stability', wireModel: 'sd3.5-large',       kind: 'image' },
  { key: 'stable-image-core',  provider: 'stability', wireModel: 'core',              kind: 'image' },
  { key: 'stable-image-ultra', provider: 'stability', wireModel: 'ultra',             kind: 'image' },

  // ── ElevenLabs (audio) ───────────────────────────────────────────────────
  { key: 'elevenlabs-v4',           provider: 'elevenlabs', wireModel: 'eleven_multilingual_v2', kind: 'audio' },
  { key: 'eleven_multilingual_v2',  provider: 'elevenlabs', wireModel: 'eleven_multilingual_v2', kind: 'audio' },

  // ── Kling (video) ────────────────────────────────────────────────────────
  { key: 'kling-2.0', provider: 'kling', wireModel: 'kling-v2-master', kind: 'video' },

  // ── Suno (music) ─────────────────────────────────────────────────────────
  { key: 'suno-v5', provider: 'suno', wireModel: 'chirp-v4', kind: 'music' },

  // ── Midjourney ───────────────────────────────────────────────────────────
  // Intentionally absent from the wire registry: no public Midjourney API.
  // Surfacing it as an unsupported model gives users an actionable message.
]

const BY_KEY = new Map<string, ModelDescriptor>(MODELS.map((m) => [m.key, m]))

/**
 * Look up a model descriptor by either its LenserFight key or its real wire
 * name. Returns `null` when the model is unknown.
 */
export function lookupModel(modelKey: string): ModelDescriptor | null {
  const direct = BY_KEY.get(modelKey)
  if (direct) return direct
  // Fall back: caller may already be using the wire name. Find by wireModel.
  for (const m of MODELS) {
    if (m.wireModel === modelKey) return m
  }
  return null
}

/**
 * Returns the provider routing key for a model, or `null` when unknown.
 * Replaces the brittle `startsWith('dall-e')` style scattered across callsites.
 */
export function detectProvider(modelKey: string): AnyProvider | null {
  return lookupModel(modelKey)?.provider ?? null
}

/** Returns the wire-format model name the provider's HTTP API will accept. */
export function resolveWireModel(modelKey: string): string {
  return lookupModel(modelKey)?.wireModel ?? modelKey
}

/** Returns the canonical output kind for a model, or `null` when unknown. */
export function modelKind(modelKey: string): ModelDescriptor['kind'] | null {
  return lookupModel(modelKey)?.kind ?? null
}

/** All registered model descriptors. Used by UI to gate selectable models. */
export function listModels(): ReadonlyArray<ModelDescriptor> {
  return MODELS
}
