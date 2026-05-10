import posthog from 'posthog-js';
import { AnalyticsEvent, AnalyticsProvider } from '../types';

const POSTHOG_KEY = import.meta.env['POSTHOG_KEY'] as string | undefined;
const POSTHOG_HOST = (import.meta.env['POSTHOG_HOST'] as string | undefined) ?? 'https://us.i.posthog.com';

export class PostHogProvider implements AnalyticsProvider {
  private initialized = false;

  init() {
    if (this.initialized || !POSTHOG_KEY) return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // Handle manually to align with GA4
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    });

    this.initialized = true;
  }

  trackPageView(path: string) {
    if (!this.initialized || !POSTHOG_KEY) return;
    posthog.capture('$pageview', {
      $current_url: path,
    });
  }

  trackEvent(event: AnalyticsEvent) {
    if (!this.initialized || !POSTHOG_KEY) return;
    posthog.capture(event.name, event.properties);
  }
}
