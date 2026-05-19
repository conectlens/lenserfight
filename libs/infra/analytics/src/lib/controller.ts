import { AnalyticsEvent, AnalyticsProvider } from './types';

export class AnalyticsController {
  private providers: AnalyticsProvider[] = [];

  registerProvider(provider: AnalyticsProvider) {
    this.providers.push(provider);
  }

  /** No-op outside production or SSR — centralized gate for all providers. */
  init() {
    if (process.env.ENV_MODE !== 'production' || typeof window === 'undefined') return;
    for (const p of this.providers) {
      try { p.init() } catch { /* providers must fail silently */ }
    }
  }

  trackPageView(path: string) {
    for (const p of this.providers) {
      try { p.trackPageView(path) } catch { /* fail silently */ }
    }
  }

  trackEvent(event: AnalyticsEvent) {
    for (const p of this.providers) {
      try { p.trackEvent(event) } catch { /* fail silently */ }
    }
  }
}

export const globalAnalyticsController = new AnalyticsController();
