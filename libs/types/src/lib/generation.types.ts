export type MediaKind = 'image' | 'video' | 'audio' | 'text' | 'file'

export interface MediaLibraryItem {
  id: string
  lenser_id: string
  url: string
  file_name: string
  mime_type: string
  media_kind: MediaKind
  width?: number
  height?: number
  duration_seconds?: number
  created_at: string
}

export type ProviderEnum =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'meta'
  | 'midjourney'
  | 'stability'
  | 'mistral'
  | 'other'
export type AICapabilityEnum =
  | 'text_generation'
  | 'image_generation'
  | 'video_generation'
  | 'audio_generation'
/**
 * DB source: ai.model_tier_enum (relocated from public.pricing_tier_enum in migration 20260440000010).
 */
export type PricingTierEnum = 'free' | 'paid' | 'enterprise'

export interface AIModel {
  id: string // uuid
  key: string
  name: string
  /** FK to ai.providers(id). Use this instead of the deprecated provider field. */
  provider_id?: string | null
  /**
   * @deprecated Use provider_id with a join to ai.providers.
   * This field reflects ai.models.provider (enum) which will be dropped after all callers migrate.
   */
  provider: ProviderEnum
  version?: string | null
  provider_url?: string | null
  description: string
  capabilities: AICapabilityEnum[]
  temperature: number
  max_tokens: number
  pricing_tier?: PricingTierEnum | null
  is_public: boolean
  is_active: boolean
  /**
   * Extensible input modality list. Source of truth for CapabilityMapper validation.
   * Values: 'text' | 'image' | 'document' | 'audio' | 'video' (migration 45).
   * Defaults to ['text'] for models where the column is not yet populated.
   */
  input_modalities: string[]
  /**
   * Extensible output modality list (migration 45).
   * Values: 'text' | 'image' | 'audio' | 'video'.
   */
  output_modalities: string[]
  created_at: string
}

export interface AIGeneration {
  id: string
  lenser_id: string
  ai_model_key: string // references ai_models(key)
  prompt_template_id: string
  media_id: string
  media?: MediaLibraryItem // Joined data
  input_text?: string
  output_type?: string
  visibility: 'public' | 'private'
  created_at: string
  original_chat_url?: string | null
}

export interface CreateGenerationDTO {
  prompt_template_id: string
  ai_model_slug: string
  media: Omit<MediaLibraryItem, 'id' | 'created_at' | 'lenser_id'>
  input_text?: string
  visibility?: 'public' | 'private'
  original_chat_url?: string | null
}

export interface AIProvider {
  id: string
  key: string
  display_name: string
}

export interface AIProviderModel {
  name: string
  key: string
}

export interface GenerationFilterOptions {
  limit?: number
  offset?: number
  mediaKind?: MediaKind | 'all'
  aiModelSlug?: string | 'all'
}
