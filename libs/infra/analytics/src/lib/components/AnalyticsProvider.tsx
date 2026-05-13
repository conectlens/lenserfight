import React, { useEffect, useRef, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { PostHogProvider as PHProvider } from '@posthog/react'
import { isProd, PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_PROJECT_TOKEN } from '@lenserfight/utils/env'
import { globalAnalyticsController } from '../controller'
import { GA4Provider } from '../providers/ga4'
import { PostHogProvider } from '../providers/posthog'
import { AnalyticsEvent } from '../types'

interface AnalyticsContextValue {
  trackEvent: (event: AnalyticsEvent) => void
  trackBattleStart: (battleId: string) => void
  trackSignup: (method: string) => void
  trackFeedback: (type: string) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  trackEvent: () => {},
  trackBattleStart: () => {},
  trackSignup: () => {},
  trackFeedback: () => {},
})

export const useAnalyticsApi = () => useContext(AnalyticsContext)

globalAnalyticsController.registerProvider(new GA4Provider())
globalAnalyticsController.registerProvider(new PostHogProvider())

const phOptions = {
  api_host: PUBLIC_POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
  persistence: 'localStorage+cookie' as const,
  ip: false,
  person_profiles: 'never' as const,
  sanitize_properties: (props: Record<string, unknown>) => {
    const blocked = ['email', 'name', 'username', 'user_id', 'distinct_id', 'phone', '$email', '$name']
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(props)) {
      if (!blocked.includes(k)) clean[k] = v
    }
    return clean
  },
}

function InnerAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      globalAnalyticsController.init()
      initialized.current = true
    }
  }, [])

  const api: AnalyticsContextValue = {
    trackEvent: (event) => globalAnalyticsController.trackEvent(event),
    trackBattleStart: (battleId) => globalAnalyticsController.trackEvent({ name: 'battle_start', properties: { battleId } }),
    trackSignup: (method) => globalAnalyticsController.trackEvent({ name: 'signup', properties: { method } }),
    trackFeedback: (type) => globalAnalyticsController.trackEvent({ name: 'feedback_submitted', properties: { type } }),
  }

  return (
    <AnalyticsContext.Provider value={api}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (isProd && PUBLIC_POSTHOG_PROJECT_TOKEN) {
    return (
      <PHProvider apiKey={PUBLIC_POSTHOG_PROJECT_TOKEN} options={phOptions}>
        <InnerAnalyticsProvider>{children}</InnerAnalyticsProvider>
      </PHProvider>
    )
  }
  return <InnerAnalyticsProvider>{children}</InnerAnalyticsProvider>
}

export const RouteTracker: React.FC = () => {
  const location = useLocation()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    const currentPath = location.pathname
    if (lastPath.current === currentPath) return
    lastPath.current = currentPath
    globalAnalyticsController.trackPageView(currentPath)
  }, [location.pathname])

  return null
}
