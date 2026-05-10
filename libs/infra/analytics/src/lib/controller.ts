import { AnalyticsEvent, AnalyticsProvider } from './types';

export class AnalyticsController {
  private providers: AnalyticsProvider[] = [];

  registerProvider(provider: AnalyticsProvider) {
    this.providers.push(provider);
  }

  init() {
    this.providers.forEach((p) => p.init());
  }

  trackPageView(path: string) {
    this.providers.forEach((p) => p.trackPageView(path));
  }

  trackEvent(event: AnalyticsEvent) {
    this.providers.forEach((p) => p.trackEvent(event));
  }
}

export const globalAnalyticsController = new AnalyticsController();
