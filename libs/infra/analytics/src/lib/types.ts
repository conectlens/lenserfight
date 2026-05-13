export type AnalyticsEventName =
  | 'battle_start'
  | 'signup'
  | 'feedback_submitted'
  | 'page_view'
  | 'thread_view'
  /** Sidebar / header navigation link clicked */
  | 'nav_click'
  /** Call-to-action button clicked (Get Started, Try Arena, etc.) */
  | 'cta_click'
  /** External link clicked (Docs, GitHub, Chainabit, etc.) */
  | 'external_link_click'

export interface AnalyticsEvent {
  name: AnalyticsEventName
  properties?: Record<string, unknown>
}

export interface AnalyticsProvider {
  init(): void
  trackPageView(path: string): void
  trackEvent(event: AnalyticsEvent): void
}
