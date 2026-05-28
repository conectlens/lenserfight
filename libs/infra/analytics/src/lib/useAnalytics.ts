import { globalAnalyticsController } from './controller'
import { AnalyticsEvent } from './types'

export function useAnalyticsApi() {
  return {
    trackEvent: (event: AnalyticsEvent) => globalAnalyticsController.trackEvent(event),
    trackPageView: (path: string) => globalAnalyticsController.trackPageView(path),
  }
}
