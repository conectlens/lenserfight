import { GA_MEASUREMENT_ID, isProd } from '@lenserfight/utils/env';
import { AnalyticsEvent, AnalyticsProvider } from '../types';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export class GA4Provider implements AnalyticsProvider {
  private initialized = false;

  init() {
    if (this.initialized || !GA_MEASUREMENT_ID || !isProd || typeof window === 'undefined') return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll handle this manually
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    this.initialized = true;
  }

  trackPageView(path: string) {
    if (!this.initialized || !GA_MEASUREMENT_ID) return;
    window.gtag('event', 'page_view', {
      page_path: path,
    });
  }

  trackEvent(event: AnalyticsEvent) {
    if (!this.initialized || !GA_MEASUREMENT_ID) return;
    window.gtag('event', event.name, event.properties);
  }
}
