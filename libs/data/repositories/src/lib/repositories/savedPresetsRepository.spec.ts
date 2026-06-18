import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SavedPresetsRepository } from './savedPresetsRepository'

const VERSION_ID = 'version-uuid-1'
const PRESET_ID = 'preset-uuid-1'

const rawPreset = {
  id: PRESET_ID,
  lenser_id: 'lenser-1',
  lens_id: 'lens-1',
  lens_version_id: VERSION_ID,
  name: 'My Preset',
  note: null,
  values: { tone: 'formal' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('SavedPresetsRepository', () => {
  let repo: SavedPresetsRepository

  beforeEach(() => {
    repo = new SavedPresetsRepository()
    vi.clearAllMocks()
  })

  describe('listSavedPresets', () => {
    it('calls supabase.rpc("fn_list_saved_presets") with correct params and returns data', async () => {
      mockRpc.mockResolvedValue({ data: [rawPreset], error: null })
      const result = await repo.listSavedPresets(VERSION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_saved_presets', {
        p_lens_version_id: VERSION_ID,
      })
      expect(result).toEqual([rawPreset])
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listSavedPresets(VERSION_ID)).toEqual([])
    })

    it('throws on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('db error') })
      await expect(repo.listSavedPresets(VERSION_ID)).rejects.toThrow('db error')
    })
  })

  describe('createSavedPreset', () => {
    it('calls supabase.rpc("fn_create_saved_preset") with correct params and returns preset', async () => {
      mockRpc.mockResolvedValue({ data: rawPreset, error: null })
      const input = {
        lenser_id: 'lenser-1',
        lens_id: 'lens-1',
        lens_version_id: VERSION_ID,
        name: 'My Preset',
        values: { tone: 'formal' },
      }
      const result = await repo.createSavedPreset(input)
      expect(mockRpc).toHaveBeenCalledWith('fn_create_saved_preset', expect.objectContaining({
        p_lens_id: 'lens-1',
        p_lens_version_id: VERSION_ID,
        p_name: 'My Preset',
      }))
      expect(result).toEqual(rawPreset)
    })

    it('throws on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('insert error') })
      await expect(
        repo.createSavedPreset({
          lenser_id: 'l', lens_id: 'ls', lens_version_id: VERSION_ID,
          name: 'x', values: {},
        }),
      ).rejects.toThrow('insert error')
    })
  })

  describe('deleteSavedPreset', () => {
    it('calls supabase.rpc("fn_delete_saved_preset") with correct preset id', async () => {
      mockRpc.mockResolvedValue({ error: null })
      await repo.deleteSavedPreset(PRESET_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_saved_preset', {
        p_preset_id: PRESET_ID,
      })
    })

    it('throws on error', async () => {
      mockRpc.mockResolvedValue({ error: new Error('delete error') })
      await expect(repo.deleteSavedPreset(PRESET_ID)).rejects.toThrow('delete error')
    })
  })
})
