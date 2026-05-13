import posthog from 'posthog-js'
import { isProd, PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_PROJECT_TOKEN } from '@lenserfight/utils/env'
import { AnalyticsEvent, AnalyticsProvider } from '../types'

export class PostHogProvider implements AnalyticsProvider {
  private initialized = false

  init() {
    if (this.initialized || !PUBLIC_POSTHOG_PROJECT_TOKEN || !isProd) return

    posthog.init(PUBLIC_POSTHOG_PROJECT_TOKEN, {
      api_host: PUBLIC_POSTHOG_HOST,
      defaults: '2026-01-30',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      // Marketing-only: never capture PII
      sanitize_properties: (props) => {
        const blocked = ['email', 'name', 'username', 'user_id', 'distinct_id', 'phone', '$email', '$name']
        const clean: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(props)) {
          if (!blocked.includes(k)) clean[k] = v
        }
        return clean
      },
      // Do not auto-capture IP or geo identifiers
      ip: false,
      person_profiles: 'never',
    })

    this.initialized = true
  }

  trackPageView(path: string) {
    if (!this.initialized) return
    posthog.capture('$pageview', { $current_url: path })
  }

  trackEvent(event: AnalyticsEvent) {
    if (!this.initialized) return
    posthog.capture(event.name, event.properties)
  }
}

/** Re-export the raw posthog instance for @posthog/react PostHogProvider wiring */
export { posthog as posthogInstance }
