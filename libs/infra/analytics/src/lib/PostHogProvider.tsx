/**
 * @deprecated Use PostHogProvider from `providers/posthog.ts` via the shared
 * AnalyticsController instead. This legacy component is kept only for backward
 * compatibility with direct imports and will be removed in a future cleanup.
 */
import posthog from 'posthog-js'
import React, { useEffect } from 'react'

const PUBLIC_POSTHOG_PROJECT_TOKEN = import.meta.env['PUBLIC_POSTHOG_PROJECT_TOKEN'] as string | undefined
const PUBLIC_POSTHOG_HOST = (import.meta.env['PUBLIC_POSTHOG_HOST'] as string | undefined) ?? 'https://us.i.posthog.com'
const _isProd = process.env.NODE_ENV === 'production'

/**
 * @deprecated Prefer PostHogProvider from `providers/posthog.ts` wired through
 * AnalyticsController + AnalyticsProvider. This component fires only in
 * production and is a no-op for community self-hosters that omit the token.
 */
export const PostHogProvider: React.FC = () => {
  useEffect(() => {
    if (!_isProd || !PUBLIC_POSTHOG_PROJECT_TOKEN) return
    if (posthog.__loaded) return
    posthog.init(PUBLIC_POSTHOG_PROJECT_TOKEN, {
      api_host: PUBLIC_POSTHOG_HOST,
      defaults: '2026-01-30',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      ip: false,
      person_profiles: 'never',
      sanitize_properties: (props) => {
        const blocked = ['email', 'name', 'username', 'user_id', 'distinct_id', 'phone', '$email', '$name']
        const clean: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(props)) {
          if (!blocked.includes(k)) clean[k] = v
        }
        return clean
      },
    })
  }, [])

  return null
}
