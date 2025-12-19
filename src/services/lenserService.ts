import { getLenserRepository } from '../adapters/lenserAdapter'
import { getShareRepository } from '../adapters/shareAdapter'
import {
  Lenser,
  CreateLenserDTO,
  LenserActivityPoint,
  ActionRecord,
  NetworkUser,
  LenserProfileDTO,
} from '../types/lenser.types'
import { PromptTemplateRecord } from '../types/prompts.types'
import { ThreadRecord } from '../types/threads.types'

import { shareService } from './shareService'

const lenserRepo = getLenserRepository()
const shareRepo = getShareRepository()

const enrichLenserProfile = async (lenser: Lenser | null): Promise<Lenser | null> => {
  if (!lenser || !lenser.website_url) return lenser

  const appDomain = window.location.host
  if (lenser.website_url.includes(appDomain) && lenser.website_url.includes('/s/')) {
    try {
      const parts = lenser.website_url.split('/s/')
      const shortId = parts[1]
      if (shortId) {
        const result = await shareRepo.resolveLink(shortId)
        if (result && result.link.display_name) {
          return { ...lenser, website_display_name: result.link.display_name }
        }
      }
    } catch (e) {
      console.warn('Failed to resolve profile website link metadata', e)
    }
  }
  return lenser
}

export const lenserService = {
  getAuthenticatedLenser: async (): Promise<Lenser | null> => {
    const lenser = await lenserRepo.getAuthenticatedLenser()
    return enrichLenserProfile(lenser)
  },

  getPublicLenserProfile: async (handle: string): Promise<LenserProfileDTO> => {
    return await lenserRepo.getPublicLenserProfile(handle)
  },

  createLenserProfile: async (data: CreateLenserDTO): Promise<Lenser> => {
    if (!data) throw new Error('Data is required')

    // Moderation Check
    // TODO: moderation policy will not be used in the beta version
    // await contentModerationService.validate(data.handle, data.display_name, data.bio);

    return lenserRepo.createLenser(data)
  },

  updateLenserProfile: async (data: Partial<Lenser>): Promise<Lenser> => {
    if (!data) throw new Error('Lenser handle is required')

    // Moderation Check
    // TODO: moderation policy will not be used in the beta version
    // await contentModerationService.validate(data.display_name, data.headline, data.bio);

    if (data.website_url) {
      let url = data.website_url.trim()

      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`
      }

      const appDomain = window.location.host
      const isTrackingLink = url.includes(appDomain) && url.includes('/s/')

      if (!isTrackingLink && url.length > 0) {
        try {
          const link = await shareService.createOrGetSharedLink({
            resourceType: 'external',
            resourceId: crypto.randomUUID(),
            displayName: url,
            meta: {
              original_website: true,
              targetUrl: url,
            },
          })

          data.website_url = shareService.getShareUrl(link.short_id)
        } catch (error) {
          console.warn('Failed to generate tracking link for profile website', error)
          data.website_url = url
        }
      } else {
        data.website_url = url
      }
    }

    const updated = await lenserRepo.updateLenser(data)
    return enrichLenserProfile(updated) as Promise<Lenser>
  },

  requestAccountDeletion: async (handle: string): Promise<void> => {
    if (!handle) throw new Error('Handle is required')
    await lenserRepo.requestDeletion(handle)
  },

  getLenserPrompts: async (
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<PromptTemplateRecord[]> => {
    return lenserRepo.getPromptsByLenser(lenserId, offset, limit, viewerId)
  },

  getLenserThreads: async (
    lenserId: string,
    offset = 0,
    limit = 10,
    viewerId?: string
  ): Promise<ThreadRecord[]> => {
    return lenserRepo.getThreadsByLenser(lenserId, offset, limit, viewerId)
  },

  getLenserActivity: async (lenserId: string): Promise<LenserActivityPoint[]> => {
    return lenserRepo.getActivityTimeline(lenserId)
  },

  getRecentlyActiveLensers: async (limit: number = 5): Promise<Lenser[]> => {
    return lenserRepo.getRecentlyActive(limit)
  },

  getLatestJoinedLensers: async (): Promise<Lenser[]> => {
    return lenserRepo.getLatestJoined()
  },

  getLenserActions: async (lenserId: string): Promise<ActionRecord[]> => {
    return lenserRepo.getLenserActions(lenserId)
  },

  getLenserNetwork: async (
    lenserId: string,
    type: 'followers' | 'following',
    page: number
  ): Promise<NetworkUser[]> => {
    return lenserRepo.getLenserNetwork(lenserId, type, page)
  },
}
