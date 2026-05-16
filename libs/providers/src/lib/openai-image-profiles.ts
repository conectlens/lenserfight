/**
 * OpenAI image-model parameter profiles.
 *
 * GRASP — *Information Expert* + *Pure Fabrication*. Each entry owns the
 * per-model rules (which parameters the OpenAI API accepts, which it rejects,
 * what the default values look like). The adapter consults the profile instead
 * of guessing, which prevents bugs like sending `style: 'vivid'` to gpt-image-1
 * (the OpenAI API returns 400: "Unknown parameter: 'style'").
 *
 * Source of truth: https://platform.openai.com/docs/api-reference/images
 *  - dall-e-2  : size 256/512/1024 square only; supports response_format; no style; no quality
 *  - dall-e-3  : size 1024x1024 / 1024x1792 / 1792x1024; supports response_format, style, quality
 *  - gpt-image-1: size 1024x1024 / 1024x1536 / 1536x1024 (and 'auto'); no style; no response_format
 *
 * LenserFight's internal model registry uses forward-looking keys (e.g. `dall-e-4`).
 * `aliasFor` maps those keys to the real OpenAI model the API will accept;
 * downstream code keeps using LF keys while the wire format stays correct.
 */

export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'auto' | 'standard' | 'hd'
export type OpenAIImageSize =
  | '256x256'
  | '512x512'
  | '1024x1024'
  | '1024x1536'
  | '1536x1024'
  | '1024x1792'
  | '1792x1024'
  | 'auto'

export interface OpenAIImageProfile {
  /** The exact model identifier OpenAI accepts on the wire. */
  realModel: string
  /** Caller-facing aliases that route to this profile (LF registry keys). */
  aliasFor?: string[]
  /** Sizes the API will accept. The first entry is the safe default. */
  validSizes: OpenAIImageSize[]
  /** Qualities the API will accept; empty array means the parameter is forbidden. */
  validQualities: OpenAIImageQuality[]
  /** Default quality if the caller didn't specify one. */
  defaultQuality?: OpenAIImageQuality
  /** Whether the API accepts the `style` parameter. */
  supportsStyle: boolean
  /** Whether the API accepts `response_format`. gpt-image-1 ALWAYS returns b64_json. */
  supportsResponseFormat: boolean
  /** Whether the API accepts `n` > 1 in a single request. */
  supportsBatch: boolean
  /** Maximum `n` per request when supportsBatch=true. */
  maxBatch: number
}

const DALL_E_2: OpenAIImageProfile = {
  realModel: 'dall-e-2',
  validSizes: ['256x256', '512x512', '1024x1024'],
  validQualities: [],
  supportsStyle: false,
  supportsResponseFormat: true,
  supportsBatch: true,
  maxBatch: 10,
}

const DALL_E_3: OpenAIImageProfile = {
  realModel: 'dall-e-3',
  validSizes: ['1024x1024', '1024x1792', '1792x1024'],
  validQualities: ['standard', 'hd'],
  defaultQuality: 'standard',
  supportsStyle: true,
  supportsResponseFormat: true,
  supportsBatch: false, // OpenAI rejects n>1 for dall-e-3
  maxBatch: 1,
}

const GPT_IMAGE_1: OpenAIImageProfile = {
  realModel: 'gpt-image-1',
  // LenserFight's seed/docs ship `dall-e-4` as the canonical next-gen image key
  // — route it to the current OpenAI image model so the wire format is correct.
  aliasFor: ['dall-e-4'],
  validSizes: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
  validQualities: ['low', 'medium', 'high', 'auto'],
  defaultQuality: 'auto',
  supportsStyle: false,
  supportsResponseFormat: false,
  supportsBatch: true,
  maxBatch: 10,
}

const PROFILES: OpenAIImageProfile[] = [DALL_E_2, DALL_E_3, GPT_IMAGE_1]

/**
 * Look up the profile for a caller-supplied model key. Returns `null` when the
 * key is unrecognized so the adapter can emit a clean `unsupported_model` error
 * instead of bouncing off the live API.
 */
export function getOpenAIImageProfile(modelKey: string): OpenAIImageProfile | null {
  for (const p of PROFILES) {
    if (p.realModel === modelKey) return p
    if (p.aliasFor?.includes(modelKey)) return p
  }
  return null
}

/**
 * Clamp the caller's requested `n` to the model's allowed batch range.
 * Falls back to 1 when the requested value is invalid.
 */
export function clampBatch(profile: OpenAIImageProfile, requested: number | undefined): number {
  const n = Number.isFinite(requested) && (requested ?? 0) > 0 ? Math.floor(requested as number) : 1
  if (!profile.supportsBatch) return 1
  return Math.min(n, profile.maxBatch)
}

/** Reduce arbitrary `${w}x${h}` user input to the nearest valid size for this model. */
export function resolveSize(
  profile: OpenAIImageProfile,
  width: number | undefined,
  height: number | undefined,
  fallback?: OpenAIImageSize,
): OpenAIImageSize {
  const candidate = width && height ? (`${width}x${height}` as OpenAIImageSize) : undefined
  if (candidate && profile.validSizes.includes(candidate)) return candidate
  if (fallback && profile.validSizes.includes(fallback)) return fallback
  return profile.validSizes[0]
}

/** Normalise quality to a valid value for this profile, or `undefined` if unsupported. */
export function resolveQuality(
  profile: OpenAIImageProfile,
  requested: string | undefined,
): OpenAIImageQuality | undefined {
  if (profile.validQualities.length === 0) return undefined
  if (requested && profile.validQualities.includes(requested as OpenAIImageQuality)) {
    return requested as OpenAIImageQuality
  }
  return profile.defaultQuality
}
