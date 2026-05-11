import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockLenserRepo, mockShareRepo } = vi.hoisted(() => ({
  mockLenserRepo: {
    getActiveLenser: vi.fn(),
    getAuthenticatedProfileGate: vi.fn(),
    getPublicLenserProfile: vi.fn(),
    createLenser: vi.fn(),
    updateLenser: vi.fn(),
    requestDeletion: vi.fn(),
    getPromptsByLenser: vi.fn(),
    getThreadsByLenser: vi.fn(),
    getActivityTimeline: vi.fn(),
    getRecentlyActive: vi.fn(),
    getLatestJoined: vi.fn(),
    getLenserActions: vi.fn(),
    getLenserNetwork: vi.fn(),
    getLanguages: vi.fn(),
    getTrendingLensers: vi.fn(),
    followLenser: vi.fn(),
    unfollowLenser: vi.fn(),
    isFollowing: vi.fn(),
    getLenserFollows: vi.fn(),
    getSuggestedLensers: vi.fn(),
    getLeaderboard: vi.fn(),
    listLensers: vi.fn(),
    getProfile: vi.fn(),
    requestFollow: vi.fn(),
    removeFollow: vi.fn(),
    acceptFollowRequest: vi.fn(),
    rejectFollowRequest: vi.fn(),
    getPendingRequests: vi.fn(),
    blockProfile: vi.fn(),
    unblockProfile: vi.fn(),
    deactivateAccount: vi.fn(),
    scheduleAccountDeletion: vi.fn(),
    cancelDeletionOnLogin: vi.fn(),
    searchLensers: vi.fn(),
  },
  mockShareRepo: {
    resolveLink: vi.fn(),
    createSharedLink: vi.fn(),
    getSharedLink: vi.fn(),
    createOrGetSharedLink: vi.fn(),
  },
}))

vi.mock('../factory', () => ({
  createLenserRepository: vi.fn(() => mockLenserRepo),
  createShareRepository: vi.fn(() => mockShareRepo),
}))

// Mock shareService to control createOrGetSharedLink and getShareUrl
vi.mock('./shareService', () => ({
  shareService: {
    createOrGetSharedLink: vi.fn(),
    getShareUrl: vi.fn((shortId: string) => `https://app.example.com/s/${shortId}`),
  },
}))

// Mock isFileDataBackend to false (Supabase mode)
vi.mock('@lenserfight/utils/env', () => ({
  isFileDataBackend: false,
}))

import { lenserService } from './lenserService'
import { shareService } from './shareService'

const LENSER_ID = 'lenser-uuid-1'
const baseLenser = {
  id: LENSER_ID,
  handle: 'alice',
  display_name: 'Alice',
  website_url: null,
}

describe('lenserService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: getActiveLenser returns null
    mockLenserRepo.getActiveLenser.mockResolvedValue(null)
    // Mock window.location.host
    Object.defineProperty(window, 'location', {
      value: { host: 'app.example.com' },
      writable: true,
    })
  })

  // ---------------------------------------------------------------------------
  // getActiveLenser — delegates + enriches
  // ---------------------------------------------------------------------------
  describe('getActiveLenser', () => {
    it('returns null when repo returns null', async () => {
      mockLenserRepo.getActiveLenser.mockResolvedValue(null)
      expect(await lenserService.getActiveLenser()).toBeNull()
    })

    it('returns lenser unchanged when website_url is null', async () => {
      mockLenserRepo.getActiveLenser.mockResolvedValue({ ...baseLenser, website_url: null })
      const result = await lenserService.getActiveLenser()
      expect(result?.handle).toBe('alice')
      expect(mockShareRepo.resolveLink).not.toHaveBeenCalled()
    })

    it('returns lenser unchanged when website_url does not contain /s/', async () => {
      mockLenserRepo.getActiveLenser.mockResolvedValue({ ...baseLenser, website_url: 'https://example.com' })
      const result = await lenserService.getActiveLenser()
      expect(result?.website_url).toBe('https://example.com')
      expect(mockShareRepo.resolveLink).not.toHaveBeenCalled()
    })

    it('enriches with display_name when website is a share link from app domain', async () => {
      const websiteUrl = 'https://app.example.com/s/abc123'
      mockLenserRepo.getActiveLenser.mockResolvedValue({ ...baseLenser, website_url: websiteUrl })
      mockShareRepo.resolveLink.mockResolvedValue({ link: { display_name: 'My Portfolio' } })
      const result = await lenserService.getActiveLenser()
      expect(result?.website_display_name).toBe('My Portfolio')
    })

    it('returns lenser without enrichment when resolveLink returns null', async () => {
      const websiteUrl = 'https://app.example.com/s/abc123'
      mockLenserRepo.getActiveLenser.mockResolvedValue({ ...baseLenser, website_url: websiteUrl })
      mockShareRepo.resolveLink.mockResolvedValue(null)
      const result = await lenserService.getActiveLenser()
      expect(result?.website_url).toBe(websiteUrl)
      expect(result).not.toHaveProperty('website_display_name')
    })

    it('returns lenser unchanged when resolveLink throws (error swallowed)', async () => {
      const websiteUrl = 'https://app.example.com/s/err123'
      mockLenserRepo.getActiveLenser.mockResolvedValue({ ...baseLenser, website_url: websiteUrl })
      mockShareRepo.resolveLink.mockRejectedValue(new Error('network error'))
      const result = await lenserService.getActiveLenser()
      expect(result?.website_url).toBe(websiteUrl)
    })
  })

  // ---------------------------------------------------------------------------
  // createLenserProfile — validation
  // ---------------------------------------------------------------------------
  describe('createLenserProfile', () => {
    it('throws when data is falsy', async () => {
      await expect(lenserService.createLenserProfile(null as any)).rejects.toThrow('Data is required')
    })

    it('delegates to lenserRepo.createLenser when data is valid', async () => {
      const created = { ...baseLenser }
      mockLenserRepo.createLenser.mockResolvedValue(created)
      const result = await lenserService.createLenserProfile({ handle: 'alice', display_name: 'Alice' } as any)
      expect(mockLenserRepo.createLenser).toHaveBeenCalledWith({ handle: 'alice', display_name: 'Alice' })
      expect(result).toEqual(created)
    })
  })

  // ---------------------------------------------------------------------------
  // updateLenserProfile — website URL processing
  // ---------------------------------------------------------------------------
  describe('updateLenserProfile', () => {
    it('throws when data is falsy', async () => {
      await expect(lenserService.updateLenserProfile(null as any)).rejects.toThrow('Lenser handle is required')
    })

    it('delegates to repo without URL processing when no website_url', async () => {
      mockLenserRepo.updateLenser.mockResolvedValue({ ...baseLenser })
      await lenserService.updateLenserProfile({ display_name: 'Bob' })
      expect(mockLenserRepo.updateLenser).toHaveBeenCalledWith({ display_name: 'Bob' })
    })

    it('prepends https:// when URL has no protocol', async () => {
      mockLenserRepo.updateLenser.mockResolvedValue({ ...baseLenser });
      (shareService.createOrGetSharedLink as ReturnType<typeof vi.fn>).mockResolvedValue({ short_id: 'abc' })
      await lenserService.updateLenserProfile({ website_url: 'example.com' })
      const updatedData = mockLenserRepo.updateLenser.mock.calls[0][0]
      expect(updatedData.website_url).toMatch(/^https:\/\//)
    })

    it('does not create a share link when URL is already a share link from app domain', async () => {
      mockLenserRepo.updateLenser.mockResolvedValue({ ...baseLenser })
      const existingShareUrl = 'https://app.example.com/s/existing-id'
      await lenserService.updateLenserProfile({ website_url: existingShareUrl })
      expect(shareService.createOrGetSharedLink).not.toHaveBeenCalled()
      expect(mockLenserRepo.updateLenser).toHaveBeenCalledWith(
        expect.objectContaining({ website_url: existingShareUrl })
      )
    })

    it('creates a tracking share link for external URLs', async () => {
      mockLenserRepo.updateLenser.mockResolvedValue({ ...baseLenser });
      (shareService.createOrGetSharedLink as ReturnType<typeof vi.fn>).mockResolvedValue({ short_id: 'xyz' });
      (shareService.getShareUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://app.example.com/s/xyz')
      await lenserService.updateLenserProfile({ website_url: 'https://external.com' })
      expect(shareService.createOrGetSharedLink).toHaveBeenCalled()
      const updatedData = mockLenserRepo.updateLenser.mock.calls[0][0]
      expect(updatedData.website_url).toBe('https://app.example.com/s/xyz')
    })

    it('falls back to raw URL when createOrGetSharedLink throws', async () => {
      mockLenserRepo.updateLenser.mockResolvedValue({ ...baseLenser });
      (shareService.createOrGetSharedLink as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('share error'))
      await lenserService.updateLenserProfile({ website_url: 'https://external.com' })
      const updatedData = mockLenserRepo.updateLenser.mock.calls[0][0]
      expect(updatedData.website_url).toBe('https://external.com')
    })
  })

  // ---------------------------------------------------------------------------
  // requestAccountDeletion — validation
  // ---------------------------------------------------------------------------
  describe('requestAccountDeletion', () => {
    it('throws when handle is empty', async () => {
      await expect(lenserService.requestAccountDeletion('')).rejects.toThrow('Handle is required')
    })

    it('delegates to lenserRepo.requestDeletion', async () => {
      mockLenserRepo.requestDeletion.mockResolvedValue(undefined)
      await lenserService.requestAccountDeletion('alice')
      expect(mockLenserRepo.requestDeletion).toHaveBeenCalledWith('alice')
    })
  })

  // ---------------------------------------------------------------------------
  // cancelDeletionOnLogin — thin delegation
  // ---------------------------------------------------------------------------
  describe('cancelDeletionOnLogin', () => {
    it('delegates to lenserRepo and returns result', async () => {
      mockLenserRepo.cancelDeletionOnLogin.mockResolvedValue({ restored: true, from_status: 'pending_deletion' })
      const result = await lenserService.cancelDeletionOnLogin()
      expect(result).toEqual({ restored: true, from_status: 'pending_deletion' })
    })
  })

  // ---------------------------------------------------------------------------
  // getAuthenticatedLenser — alias for getActiveLenser
  // ---------------------------------------------------------------------------
  describe('getAuthenticatedLenser', () => {
    it('returns same result as getActiveLenser', async () => {
      const lenser = { ...baseLenser }
      mockLenserRepo.getActiveLenser.mockResolvedValue(lenser)
      const result = await lenserService.getAuthenticatedLenser()
      expect(result).toEqual(lenser)
    })
  })
})
