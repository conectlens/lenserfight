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
import ExperimentalBadge from './ExperimentalBadge.vue'
import { globalAnalyticsController, GA4Provider } from '@lenserfight/infra/analytics'

const KNOWN_LOCALES = new Set(['en', 'tr', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'it'])
const ENABLED_LOCALES = new Set(['en', 'tr'])
const LOCALE_COOKIE_NAME = 'lf-locale'
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function getCookieDomain(hostname: string): string {
  if (!hostname) return ''
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname
  if (hostname.endsWith('.localhost')) return '.localhost'
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) return hostname
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : hostname
}

function readLocaleCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )lf-locale=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

function writeLocaleCookie(code: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  if (!ENABLED_LOCALES.has(code)) return
  const domain = getCookieDomain(window.location.hostname)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domainAttr = domain ? `; Domain=${domain}` : ''
  document.cookie =
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(code)}${domainAttr}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

function redirectUnprefixedPath(): void {
  if (typeof window === 'undefined') return
  const { pathname, search, hash } = window.location
  const segments = pathname.replace(/^\//, '').split('/')
  if (KNOWN_LOCALES.has(segments[0])) return
  // No locale in URL — prefer the cross-app cookie so a locale chosen in
  // apps/web or apps/arena follows the user into docs on first visit.
  const cookieLocale = readLocaleCookie()
  const target = cookieLocale && ENABLED_LOCALES.has(cookieLocale) ? cookieLocale : 'en'
  const rest = pathname === '/' ? '' : pathname
  window.location.replace(`/${target}${rest}${search}${hash}`)
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
    ctx.app.component('ExperimentalBadge', ExperimentalBadge)

    // Redirect any path without a locale prefix to the cookie's locale (or /en)
    redirectUnprefixedPath()

    // Mirror the active locale into the shared cookie on initial load.
    if (typeof window !== 'undefined') {
      const firstSegment = window.location.pathname.replace(/^\//, '').split('/')[0]
      writeLocaleCookie(firstSegment)
    }

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
        // Persist the active locale to the shared cookie so a docs visitor
        // who later opens apps/web or apps/arena lands in the same language.
        const firstSegment = to.replace(/^\//, '').split('/')[0]
        writeLocaleCookie(firstSegment)

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
