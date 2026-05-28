import { globalAnalyticsController } from './controller'
import { AnalyticsEvent } from './types'

export function trackEvent(event: AnalyticsEvent): void {
  globalAnalyticsController.trackEvent(event)
}

export function trackPageView(path: string): void {
  globalAnalyticsController.trackPageView(path)
}
