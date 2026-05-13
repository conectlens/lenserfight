import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import MermaidDiagram from './MermaidDiagram.vue'
import CopyPageButton from './CopyPageButton.vue'
import EditPageButton from './EditPageButton.vue'
import DocsLogo from './DocsLogo.vue'
import FeedbackButton from './FeedbackButton.vue'
import WaitingListButton from './WaitingListButton.vue'
import DocsFooter from './DocsFooter.vue'
import HotLenses from './HotLenses.vue'
import AiLenserFamily from './AiLenserFamily.vue'
import NotFoundActions from './NotFoundActions.vue'
import { globalAnalyticsController, GA4Provider } from '@lenserfight/infra/analytics'

const KNOWN_LOCALES = new Set(['en', 'tr', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'it'])

function redirectUnprefixedPath(): void {
  if (typeof window === 'undefined') return
  const { pathname, search, hash } = window.location
  const segments = pathname.replace(/^\//, '').split('/')
  if (KNOWN_LOCALES.has(segments[0])) return
  // Bare root → English home
  const rest = pathname === '/' ? '' : pathname
  window.location.replace(`/en${rest}${search}${hash}`)
}

const POSTHOG_TOKEN = import.meta.env['PUBLIC_POSTHOG_PROJECT_TOKEN'] as string | undefined
const POSTHOG_HOST = (import.meta.env['PUBLIC_POSTHOG_HOST'] as string | undefined) ?? 'https://us.i.posthog.com'
const isProd = import.meta.env.MODE === 'production'

// Initialize analytics once — GA4 always, PostHog only in production
globalAnalyticsController.registerProvider(new GA4Provider())

if (typeof window !== 'undefined') {
  globalAnalyticsController.init()

  if (isProd && POSTHOG_TOKEN) {
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(POSTHOG_TOKEN, {
        api_host: POSTHOG_HOST,
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

      // Wire posthog page tracking through the docs router
      ;(window as unknown as Record<string, unknown>).__posthogDocs = posthog
    })
  }
}

export default {
  ...DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h('div', { class: 'lf-page-actions' }, [
        h(CopyPageButton),
        h(EditPageButton),
      ]),
      'layout-bottom': () => [
        h(DocsFooter),
        h(FeedbackButton),
        h(WaitingListButton),
      ],
      'not-found': () => h(NotFoundActions),
    })
  },
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx)
    ctx.app.component('MermaidDiagram', MermaidDiagram)
    ctx.app.component('DocsLogo', DocsLogo)
    ctx.app.component('HotLenses', HotLenses)
    ctx.app.component('AiLenserFamily', AiLenserFamily)

    // Redirect any path without a locale prefix to /en/:path
    redirectUnprefixedPath()

    ctx.router.onBeforeRouteChange = (to) => {
      if (typeof window === 'undefined') return
      const segments = to.replace(/^\//, '').split('/')
      if (!KNOWN_LOCALES.has(segments[0])) {
        const rest = to === '/' ? '' : to
        window.location.replace(`/en${rest}`)
        return false
      }
    }

    ctx.router.onAfterRouteChanged = (to) => {
      if (typeof window !== 'undefined') {
        globalAnalyticsController.trackPageView(to)

        const ph = (window as unknown as Record<string, unknown>).__posthogDocs
        if (ph && typeof (ph as Record<string, unknown>)['capture'] === 'function') {
          ;(ph as { capture: (event: string, props: Record<string, unknown>) => void }).capture('$pageview', {
            $current_url: to,
            location: 'docs',
          })
        }
      }
    }
  },
} satisfies Theme
