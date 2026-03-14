import { SupabaseAnalyticsRepository } from '@lenserfight/data/repositories'
import { AnalyticsTargetType, LogPageViewDTO } from '@lenserfight/types'

const repo = new SupabaseAnalyticsRepository()

export const analyticsService = {
  trackView: async (
    targetType: AnalyticsTargetType,
    targetId: string | null | undefined,
    identity: { userId?: string | null; lenserId?: string | null }
  ) => {
    const dto: LogPageViewDTO = {
      lenserId: identity.lenserId,
      userId: identity.userId,
      targetType: targetType,
      targetId: targetId,
      path: window.location.pathname,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
      clientIp: null, // Backend usually handles this, or can be fetched via service
    }

    return repo.logPageView(dto)
  },
}
