import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseAICatalogRepository } from './aiCatalogRepository'

describe('SupabaseAICatalogRepository', () => {
  let repo: SupabaseAICatalogRepository

  beforeEach(() => {
    repo = new SupabaseAICatalogRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // listProviders
  // ---------------------------------------------------------------------------
  describe('listProviders', () => {
    it('calls fn_ai_catalog_providers with no params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listProviders()
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_catalog_providers')
    })

    it('maps rows to AIProvider shape', async () => {
      const row = { id: 'p-1', key: 'openai', display_name: 'OpenAI', base_url: null, docs_url: null, support_level: 'full', logo_slug: null, metadata: {}, is_active: true }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.listProviders()
      expect(result[0].key).toBe('openai')
      expect(result[0].is_active).toBe(true)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listProviders()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('provider error') })
      await expect(repo.listProviders()).rejects.toThrow('provider error')
    })
  })

  // ---------------------------------------------------------------------------
  // listModels
  // ---------------------------------------------------------------------------
  describe('listModels', () => {
    it('calls fn_ai_catalog_models with null filter by default', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listModels()
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_catalog_models', {
        p_provider_key: null,
        p_support_level: null,
        p_capability: null,
        p_modality: null,
      })
    })

    it('passes filter values when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listModels({ providerKey: 'openai', supportLevel: 'full', capability: 'vision', modality: 'image' })
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_catalog_models', {
        p_provider_key: 'openai',
        p_support_level: 'full',
        p_capability: 'vision',
        p_modality: 'image',
      })
    })

    it('maps rows to AIModelCatalogEntry shape with defaults', async () => {
      const row = { id: 'm-1', provider_id: 'p-1', provider_key: 'openai', provider_name: 'OpenAI', key: 'gpt-4', name: 'GPT-4', description: '', support_level: 'full', status: 'active', capabilities: ['text'], input_modalities: ['text'], output_modalities: ['text'], context_window_tokens: 8192, is_active: true }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.listModels()
      expect(result[0].key).toBe('gpt-4')
      expect(result[0].context_window_tokens).toBe(8192)
      expect(result[0].is_active).toBe(true)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('models error') })
      await expect(repo.listModels()).rejects.toThrow('models error')
    })
  })

  // ---------------------------------------------------------------------------
  // getModelDetail
  // ---------------------------------------------------------------------------
  describe('getModelDetail', () => {
    it('calls fn_ai_catalog_model_detail with providerKey and modelKey', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await repo.getModelDetail('openai', 'gpt-4')
      expect(mockRpc).toHaveBeenCalledWith('fn_ai_catalog_model_detail', {
        p_provider_key: 'openai',
        p_model_key: 'gpt-4',
      })
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getModelDetail('openai', 'gpt-4')).toBeNull()
    })

    it('returns null when data is empty array', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getModelDetail('openai', 'gpt-4')).toBeNull()
    })

    it('returns mapped model when data is array', async () => {
      const row = { id: 'm-1', provider_id: 'p-1', provider_key: 'openai', provider_name: 'OpenAI', key: 'gpt-4', name: 'GPT-4', description: 'Advanced model', support_level: 'full', status: 'active', capabilities: [], input_modalities: ['text'], output_modalities: ['text'], is_active: true }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getModelDetail('openai', 'gpt-4')
      expect(result?.key).toBe('gpt-4')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('detail error') })
      await expect(repo.getModelDetail('openai', 'gpt-4')).rejects.toThrow('detail error')
    })
  })
})
