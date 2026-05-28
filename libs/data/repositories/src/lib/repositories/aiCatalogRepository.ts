import { supabase } from '@lenserfight/data/supabase'
import type { AIModelCatalogEntry, AIProvider } from '@lenserfight/types'

export interface AIModelCatalogFilter {
  providerKey?: string | null
  supportLevel?: string | null
  capability?: string | null
  modality?: string | null
}

export interface AICatalogRepositoryPort {
  listProviders(): Promise<AIProvider[]>
  listModels(filter?: AIModelCatalogFilter): Promise<AIModelCatalogEntry[]>
  getModelDetail(providerKey: string, modelKey: string): Promise<AIModelCatalogEntry | null>
}

export class SupabaseAICatalogRepository implements AICatalogRepositoryPort {
  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  async listProviders(): Promise<AIProvider[]> {
    const { data, error } = await supabase.rpc('fn_ai_catalog_providers')

    if (error) {
      throw error
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id ?? ''),
      key: String(row.key ?? ''),
      display_name: String(row.display_name ?? ''),
      base_url: (row.base_url as string | null | undefined) ?? null,
      docs_url: (row.docs_url as string | null | undefined) ?? null,
      support_level: (row.support_level as AIProvider['support_level']) ?? 'catalog_only',
      logo_slug: (row.logo_slug as string | null | undefined) ?? null,
      metadata: (row.metadata as Record<string, unknown> | null | undefined) ?? {},
      is_active: (row.is_active as boolean | undefined) ?? false,
    }))
  }

  async listModels(filter: AIModelCatalogFilter = {}): Promise<AIModelCatalogEntry[]> {
    const { data, error } = await supabase.rpc('fn_ai_catalog_models', {
      p_provider_key: filter.providerKey ?? null,
      p_support_level: filter.supportLevel ?? null,
      p_capability: filter.capability ?? null,
      p_modality: filter.modality ?? null,
    })

    if (error) {
      throw error
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapModelRow(row))
  }

  async getModelDetail(providerKey: string, modelKey: string): Promise<AIModelCatalogEntry | null> {
    const { data, error } = await supabase.rpc('fn_ai_catalog_model_detail', {
      p_provider_key: providerKey,
      p_model_key: modelKey,
    })

    if (error) {
      throw error
    }

    const row = Array.isArray(data) ? data[0] : data
    return row ? this.mapModelRow(row as Record<string, unknown>) : null
  }

  private mapModelRow(row: Record<string, unknown>): AIModelCatalogEntry {
    return {
      id: String(row.id ?? ''),
      provider_id: String(row.provider_id ?? ''),
      provider_key: String(row.provider_key ?? ''),
      provider_name: String(row.provider_name ?? ''),
      key: String(row.key ?? ''),
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
      docs_url: (row.docs_url as string | null | undefined) ?? null,
      support_level: (row.support_level as AIModelCatalogEntry['support_level']) ?? 'catalog_only',
      status: (row.status as AIModelCatalogEntry['status']) ?? 'active',
      capabilities: (row.capabilities as string[] | null | undefined) ?? [],
      input_modalities: (row.input_modalities as string[] | null | undefined) ?? ['text'],
      output_modalities: (row.output_modalities as string[] | null | undefined) ?? ['text'],
      context_window_tokens: (row.context_window_tokens as number | null | undefined) ?? null,
      supports_tools: (row.supports_tools as boolean | undefined) ?? false,
      supports_json_schema: (row.supports_json_schema as boolean | undefined) ?? false,
      supports_vision: (row.supports_vision as boolean | undefined) ?? false,
      supports_streaming: (row.supports_streaming as boolean | undefined) ?? false,
      use_cases: (row.use_cases as string[] | null | undefined) ?? [],
      developer_summary: String(row.developer_summary ?? ''),
      user_summary: String(row.user_summary ?? ''),
      metadata: (row.metadata as Record<string, unknown> | null | undefined) ?? {},
      unit_type:
        (row.unit_type as AIModelCatalogEntry['unit_type'] | undefined) ?? null,
      cost_per_unit: this.parseNumber(row.cost_per_unit),
      input_cost_per_1k_tokens: this.parseNumber(row.input_cost_per_1k_tokens),
      output_cost_per_1k_tokens: this.parseNumber(row.output_cost_per_1k_tokens),
      is_active: (row.is_active as boolean | undefined) ?? false,
    }
  }
}
