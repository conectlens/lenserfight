import type { AIProviderSupportLevel, AIModelStatus } from './generation.types'

export interface AIModelCatalogEntry {
  id: string
  provider_id: string
  provider_key: string
  provider_name: string
  key: string
  name: string
  description: string
  docs_url: string | null
  support_level: AIProviderSupportLevel
  status: AIModelStatus
  capabilities: string[]
  input_modalities: string[]
  output_modalities: string[]
  context_window_tokens: number | null
  supports_tools: boolean
  supports_json_schema: boolean
  supports_vision: boolean
  supports_streaming: boolean
  use_cases: string[]
  developer_summary: string
  user_summary: string
  metadata: Record<string, unknown>
  unit_type: 'tokens' | 'image' | 'video_second' | 'audio_second' | null
  cost_per_unit: number | null
  input_cost_per_1k_tokens: number | null
  output_cost_per_1k_tokens: number | null
  is_active: boolean
}
