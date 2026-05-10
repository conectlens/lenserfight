export type AnalyticsEventName = 'battle_start' | 'signup' | 'feedback_submitted' | 'page_view' | 'thread_view'

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: Record<string, unknown>;
}

export interface AnalyticsProvider {
  init(): void;
  trackPageView(path: string): void;
  trackEvent(event: AnalyticsEvent): void;
}
