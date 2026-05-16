// @ts-nocheck
// Deno-side mirror of libs/providers/src/lib/openai-image-profiles.ts.
// Keep in lock-step with the node copy until we publish a Deno-compatible package.

export interface OpenAIImageProfile {
  realModel: string
  validSizes: string[]
  validQualities: string[]
  defaultQuality?: string
  supportsStyle: boolean
  supportsResponseFormat: boolean
  supportsBatch: boolean
  maxBatch: number
}

export const OPENAI_IMAGE_PROFILES: Record<string, OpenAIImageProfile> = {
  'dall-e-2': {
    realModel: 'dall-e-2',
    validSizes: ['256x256', '512x512', '1024x1024'],
    validQualities: [],
    supportsStyle: false,
    supportsResponseFormat: true,
    supportsBatch: true,
    maxBatch: 10,
  },
  'dall-e-3': {
    realModel: 'dall-e-3',
    validSizes: ['1024x1024', '1024x1792', '1792x1024'],
    validQualities: ['standard', 'hd'],
    defaultQuality: 'standard',
    supportsStyle: true,
    supportsResponseFormat: true,
    supportsBatch: false,
    maxBatch: 1,
  },
  'gpt-image-1': {
    realModel: 'gpt-image-1',
    validSizes: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
    validQualities: ['low', 'medium', 'high', 'auto'],
    defaultQuality: 'auto',
    supportsStyle: false,
    supportsResponseFormat: false,
    supportsBatch: true,
    maxBatch: 10,
  },
  'dall-e-4': {
    realModel: 'gpt-image-1',
    validSizes: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
    validQualities: ['low', 'medium', 'high', 'auto'],
    defaultQuality: 'auto',
    supportsStyle: false,
    supportsResponseFormat: false,
    supportsBatch: true,
    maxBatch: 10,
  },
}

export function buildOpenAIImageBody(
  model: string,
  prompt: string,
  params: { width?: number; height?: number; n?: number; quality?: string; style?: string } | undefined,
): { wireBody: Record<string, unknown>; profile: OpenAIImageProfile } | { error: string } {
  const profile = OPENAI_IMAGE_PROFILES[model]
  if (!profile) {
    return {
      error: `OpenAI image model "${model}" is not supported. Use dall-e-2, dall-e-3, or gpt-image-1 (alias dall-e-4).`,
    }
  }

  const requestedSize =
    params?.width && params?.height ? `${params.width}x${params.height}` : undefined
  const size = requestedSize && profile.validSizes.includes(requestedSize)
    ? requestedSize
    : profile.validSizes[0]

  const requestedQuality = params?.quality
  const quality =
    profile.validQualities.length === 0
      ? undefined
      : requestedQuality && profile.validQualities.includes(requestedQuality)
        ? requestedQuality
        : profile.defaultQuality

  const requestedN = params?.n ?? 1
  const n = profile.supportsBatch ? Math.min(Math.max(1, requestedN), profile.maxBatch) : 1

  const wireBody: Record<string, unknown> = {
    model: profile.realModel,
    prompt,
    n,
    size,
  }
  if (quality) wireBody.quality = quality
  if (profile.supportsStyle && params?.style) wireBody.style = params.style
  if (profile.supportsResponseFormat) wireBody.response_format = 'url'

  return { wireBody, profile }
}
