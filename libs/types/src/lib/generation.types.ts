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
export type PricingTierEnum = 'free' | 'paid' | 'enterprise'

export interface AIModel {
  id: string // uuid
  key: string
  name: string
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

export interface GenerationFilterOptions {
  limit?: number
  offset?: number
  mediaKind?: MediaKind | 'all'
  aiModelSlug?: string | 'all'
}
