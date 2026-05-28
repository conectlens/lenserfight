import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockGetSession, mockCachedSession } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetSession: vi.fn(),
  mockCachedSession: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    auth: { getSession: mockGetSession },
  },
  getCachedSession: mockCachedSession,
}))

import { SupabasePreferencesRepository } from './preferencesRepository'

describe('SupabasePreferencesRepository', () => {
  let repo: SupabasePreferencesRepository

  beforeEach(() => {
    repo = new SupabasePreferencesRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-jwt' } } })
    // Default: authenticated session present
    mockCachedSession.mockReturnValue({ user: { id: 'user-1' } })
  })

  // ---------------------------------------------------------------------------
  // getPreferences
  // ---------------------------------------------------------------------------
  describe('getPreferences', () => {
    it('calls fn_lensers_get_preferences with no params', async () => {
      const prefs = { theme: 'dark', language: 'en' }
      mockRpc.mockResolvedValue({ data: prefs, error: null })
      const result = await repo.getPreferences()
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_preferences')
      expect(result).toEqual(prefs)
    })

    it('returns null when Supabase returns error (silently swallowed)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('not found') })
      expect(await repo.getPreferences()).toBeNull()
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getPreferences()).toBeNull()
    })

    it('returns null on network exception (silently swallowed)', async () => {
      mockRpc.mockRejectedValue(new Error('NetworkError'))
      expect(await repo.getPreferences()).toBeNull()
    })

    it('returns null without calling RPC when no session exists', async () => {
      mockCachedSession.mockReturnValue(null)
      expect(await repo.getPreferences()).toBeNull()
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // updatePreferences
  // ---------------------------------------------------------------------------
  describe('updatePreferences', () => {
    it('calls fn_lensers_update_preferences with p_data excluding read-only fields', async () => {
      await repo.updatePreferences({
        theme: 'dark',
        language: 'en',
        id: 'should-be-stripped' as any,
        lenser_id: 'should-be-stripped' as any,
        created_at: 'should-be-stripped' as any,
        updated_at: 'should-be-stripped' as any,
      } as any)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_update_preferences', {
        p_data: { theme: 'dark', language: 'en' },
      })
    })

    it('rethrows non-NetworkError exceptions', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('DB error') })
      await expect(repo.updatePreferences({ theme: 'light' })).rejects.toThrow('DB error')
    })

    it('suppresses NetworkError exceptions silently', async () => {
      mockRpc.mockRejectedValue(new Error('NetworkError: connection refused'))
      await expect(repo.updatePreferences({ theme: 'dark' })).resolves.toBeUndefined()
    })

    it('skips RPC when no session exists', async () => {
      mockCachedSession.mockReturnValue(null)
      await repo.updatePreferences({ theme: 'dark' })
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // updateTheme — delegates to updatePreferences
  // ---------------------------------------------------------------------------
  describe('updateTheme', () => {
    it('calls updatePreferences with theme field', async () => {
      await repo.updateTheme('dark')
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_update_preferences', {
        p_data: { theme: 'dark' },
      })
    })

    it('supports all three theme values', async () => {
      for (const theme of ['light', 'dark', 'system'] as const) {
        vi.clearAllMocks()
        await repo.updateTheme(theme)
        expect(mockRpc).toHaveBeenCalledWith('fn_lensers_update_preferences', { p_data: { theme } })
      }
    })
  })
})
