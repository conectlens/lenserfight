import { useCallback } from 'react'
import { AnalyticsTargetType } from '@lenserfight/types'

import { analyticsService } from './analyticsService'

export const useAnalytics = () => {
  const trackView = useCallback(
    (
      targetType: AnalyticsTargetType,
      targetId?: string,
      identity?: { userId?: string | null; lenserId?: string | null }
    ) => {
      analyticsService.trackView(targetType, targetId, identity ?? {})
    },
    []
  )

  return { trackView }
}
