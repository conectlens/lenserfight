import { getShareRepository } from '../adapters/shareAdapter'
import { CreateLinkDTO, SharedLink } from '../types/share.types'

const shareRepo = getShareRepository()

export const shareService = {
  createOrGetSharedLink: async (dto: CreateLinkDTO): Promise<SharedLink> => {
    return shareRepo.createOrGetSharedLink(dto)
  },

  /**
   * Generates a full URL for the short link.
   * In Mock mode, it uses window.location.origin + /#/s/ + shortId.
   * In Prod, it would be https://lenserfight.com/s/ + shortId.
   */
  getShareUrl: (shortId: string): string => {
    const origin = window.location.origin
    // Check if we are in HashRouter mode (Mock usually is)
    const isHashRouter = window.location.hash.includes('#')

    if (isHashRouter) {
      return `${origin}/#/s/${shortId}`
    }
    // Production Edge Function URL assumption
    return `${origin}/s/${shortId}`
  },

  resolveAndLog: async (shortId: string) => {
    const result = await shareRepo.resolveLink(shortId)
    if (result) {
      // Fire and forget logging
      shareRepo.logEvent(shortId, 'opened')
    }
    return result
  },
}
