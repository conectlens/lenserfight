import { supabase } from '@lenserfight/data/supabase'
import {
  AIGeneration,
  CreateGenerationDTO,
  GenerationFilterOptions,
  AIModel,
  AIProvider,
  AIProviderModel,
} from '@lenserfight/types'


type AIModelPublicRow = {
  id: string
  provider_id: string
  provider_key: AIModel['provider']
  provider_name: string
  key: string
  name: string
  description: string
  docs_url?: string | null
  support_level?: AIModel['support_level']
  status?: AIModel['status']
  capabilities?: AIModel['capabilities']
  input_modalities?: string[] | null
  output_modalities?: string[] | null
  context_window_tokens?: number | null
  supports_tools?: boolean
  supports_json_schema?: boolean
  supports_vision?: boolean
  supports_streaming?: boolean
  use_cases?: string[] | null
  developer_summary?: string | null
  user_summary?: string | null
  metadata?: Record<string, unknown> | null
  is_active: boolean
}


export interface GenerationRepositoryPort {
  getGenerationsForPrompt(
    promptId: string,
    lenserId: string,
    options?: GenerationFilterOptions
  ): Promise<AIGeneration[]>
  createGeneration(data: CreateGenerationDTO): Promise<void>
  deleteGeneration(id: string): Promise<void>
  getAIModels(): Promise<AIModel[]>
  getActiveProviders(): Promise<AIProvider[]>
  getModelsByProvider(providerKey: string): Promise<AIProviderModel[]>
  getModelById(modelId: string): Promise<AIModel | null>
}


export class SupabaseGenerationRepository implements GenerationRepositoryPort {
  async getGenerationsForPrompt(
    promptId: string,
    lenserId: string,
    options: GenerationFilterOptions = {}
  ): Promise<AIGeneration[]> {
    const {
      limit = 20,
      offset = 0,
      mediaKind = 'all',
      aiModelSlug = 'all',
    } = options

    const { data, error } = await supabase.rpc(
      'fn_ai_get_generations_for_prompt',
      {
        p_lens_id: promptId,
        p_lenser_id: lenserId,
        p_limit: limit,
        p_offset: offset,
        p_media_kind: mediaKind === 'all' ? null : mediaKind,
        p_ai_model_slug: aiModelSlug === 'all' ? null : aiModelSlug,
      }
    )

    if (error) {
      console.error('getGenerationsForPrompt failed:', error)
      throw error
    }

    // RPC already returns the correct shape
    // No joins, no arrays, no post-processing
    return (data ?? []) as AIGeneration[]
  }

  async createGeneration(dto: CreateGenerationDTO): Promise<void> {
    const { error } = await supabase.rpc('fn_ai_create_generation', {
      p_ai_model_slug: dto.ai_model_slug,
      p_lens_id: dto.lens_id,
      p_media: dto.media,
      p_input_text: dto.input_text ?? null,
      p_visibility: dto.visibility ?? 'private',
      p_original_chat_url: dto.original_chat_url ?? null,
    })

    if (error) {
      console.error('Generation failed:', error)
      throw error
    }
  }

  async deleteGeneration(id: string): Promise<void> {
    const { error } = await supabase.from('ai_generations').delete().eq('id', id)
    if (error) throw error
  }

  async getActiveProviders(): Promise<AIProvider[]> {
    const { data, error } = await supabase.rpc('fn_ai_catalog_providers')
    if (error) {
      console.warn('fn_ai_catalog_providers failed', error)
      return []
    }
    return ((data ?? []) as Record<string, unknown>[]).map((p) => ({
      id: String(p.id ?? ''),
      key: String(p.key ?? ''),
      display_name: String(p.display_name ?? ''),
      base_url: (p.base_url as string | null | undefined) ?? null,
      docs_url: (p.docs_url as string | null | undefined) ?? null,
      support_level: (p.support_level as AIProvider['support_level']) ?? 'catalog_only',
      logo_slug: (p.logo_slug as string | null | undefined) ?? null,
      metadata: (p.metadata as Record<string, unknown> | null | undefined) ?? {},
      is_active: (p.is_active as boolean | undefined) ?? false,
    }))
  }

  async getModelsByProvider(providerKey: string): Promise<AIProviderModel[]> {
    const { data, error } = await supabase.rpc('fn_ai_catalog_models', {
      p_provider_key: providerKey,
      p_support_level: null,
      p_capability: null,
      p_modality: null,
    })
    if (error) {
      console.warn('fn_ai_catalog_models failed', error)
      return []
    }
    return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
      id: (m.id as string | undefined) ?? undefined,
      name: String(m.name ?? ''),
      key: String(m.key ?? ''),
      provider_key: (m.provider_key as string | undefined) ?? providerKey,
      inputModalities: (m.input_modalities as string[] | null) ?? ['text'],
      outputModalities: (m.output_modalities as string[] | null) ?? ['text'],
      contextWindowTokens: (m.context_window_tokens as number | undefined) ?? undefined,
      support_level: (m.support_level as AIProviderModel['support_level']) ?? 'catalog_only',
      status: (m.status as AIProviderModel['status']) ?? 'active',
      capabilities: (m.capabilities as string[] | undefined) ?? [],
      supportsStreaming: (m.supports_streaming as boolean | undefined) ?? false,
      developer_summary: (m.developer_summary as string | undefined) ?? '',
      user_summary: (m.user_summary as string | undefined) ?? '',
    }))
  }

  async getModelById(modelId: string): Promise<AIModel | null> {
    const { data, error } = await supabase
      .schema('ai')
      .from('models')
      .select('id, key, name, provider_id, description, capabilities, temperature, max_tokens, pricing_tier, is_public, is_active, input_modalities, output_modalities, created_at')
      .eq('id', modelId)
      .maybeSingle()

    if (error) {
      console.warn('getModelById failed', error)
      return null
    }
    if (!data) return null

    const row = data as Record<string, unknown>
    const providerId = (row.provider_id as string | undefined) ?? null
    let providerKey: AIModel['provider'] = 'other'
    let providerDisplayName = 'Unknown'

    if (providerId) {
      const { data: providerRow, error: providerError } = await supabase
        .schema('ai')
        .from('providers')
        .select('key, display_name')
        .eq('id', providerId)
        .maybeSingle()

      if (!providerError && providerRow) {
        providerKey = (providerRow.key as AIModel['provider']) ?? 'other'
        providerDisplayName = (providerRow.display_name as string) ?? providerDisplayName
      }
    }

    return {
      id: row.id as string,
      key: (row.key as string | null) ?? '',
      name: row.name as string,
      provider: providerKey,
      provider_id: providerId,
      providerDisplayName,
      version: null,
      provider_url: null,
      description: (row.description as string) ?? '',
      capabilities: (row.capabilities as AIModel['capabilities']) ?? [],
      temperature: (row.temperature as number) ?? 0,
      max_tokens: (row.max_tokens as number) ?? 0,
      pricing_tier: (row.pricing_tier as AIModel['pricing_tier']) ?? null,
      is_public: (row.is_public as boolean) ?? true,
      is_active: (row.is_active as boolean) ?? false,
      input_modalities: (row.input_modalities as string[]) ?? ['text'],
      output_modalities: (row.output_modalities as string[]) ?? ['text'],
      created_at: (row.created_at as string) ?? '',
    }
  }

  async getAIModels(): Promise<AIModel[]> {
    const { data, error } = await supabase.rpc('fn_ai_catalog_models', {
      p_provider_key: null,
      p_support_level: null,
      p_capability: null,
      p_modality: null,
    })

    if (error) {
      console.warn('Failed to fetch AI catalog models, returning empty list.', error)
      return []
    }

    return ((data ?? []) as AIModelPublicRow[])
      .map((row) => ({
        id: row.id,
        key: row.key,
        name: row.name,
        provider: row.provider_key,
        provider_id: row.provider_id,
        providerDisplayName: row.provider_name,
        version: null,
        provider_url: row.docs_url ?? null,
        description: row.description ?? '',
        capabilities: row.capabilities ?? [],
        docs_url: row.docs_url ?? null,
        support_level: row.support_level ?? 'catalog_only',
        status: row.status ?? 'active',
        temperature: 0,
        max_tokens: row.context_window_tokens ?? 0,
        pricing_tier: null,
        is_public: true,
        is_active: row.is_active,
        supports_tools: row.supports_tools ?? false,
        supports_json_schema: row.supports_json_schema ?? false,
        supports_vision: row.supports_vision ?? false,
        supports_streaming: row.supports_streaming ?? false,
        use_cases: row.use_cases ?? [],
        developer_summary: row.developer_summary ?? '',
        user_summary: row.user_summary ?? '',
        metadata: row.metadata ?? {},
        input_modalities: row.input_modalities ?? ['text'],
        output_modalities: row.output_modalities ?? ['text'],
        created_at: '',
      }))
  }
}
