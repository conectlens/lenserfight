import { AnalyticsTargetType, LogPageViewDTO } from '@lenserfight/types'

let repo: any | null = null;
async function getRepo() {
  if (!repo) {
    const { SupabaseAnalyticsRepository } = await import('@lenserfight/data/repositories');
    repo = new SupabaseAnalyticsRepository();
  }
  return repo;
}

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
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer: typeof document !== 'undefined' ? document.referrer : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      clientIp: null, // Backend usually handles this, or can be fetched via service
    }

    const repository = await getRepo();
    return repository.logPageView(dto)
  },
}
