import * as fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveTourForPath } from '../registry'

import { TOURS } from './index'

import type { TourStep } from '../types'

/**
 * Coverage / drift guard for the tour registry: every route declared in the
 * web router must either resolve to a tour definition or be explicitly
 * excluded here, and every i18n key referenced by a tour must exist in BOTH
 * locale files.
 */

const REPO_ROOT = path.resolve(__dirname, '../../../../../..')
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src')

/**
 * Routes that intentionally have no tour, with the reason why.
 * Keyed by the literal `path="..."` value from the router.
 */
const EXCLUDED: Readonly<Record<string, string>> = {
  '*': 'catch-all redirect to /',
  '/about': 'external marketing redirect to the landing site',
  '/product': 'external marketing redirect to the landing site',
  '/faq': 'external marketing redirect to the landing site',
  '/terms': 'external policy redirect to the landing site',
  '/privacy': 'external policy redirect to the landing site',
  '/cookies': 'external policy redirect to the landing site',
  '/policies': 'external policy redirect to the landing site',
  '/policies/*': 'external policy redirect to the landing site',
  '/account': 'redirect to /account/dashboard',
  '/agents': 'legacy redirect to /lensers?type=ai',
  '/agents/:id': 'legacy agent profile redirect',
  '/agents/:agentId/workspace': 'legacy agent workspace (unframed)',
  '/app': 'legacy redirect to /',
  '/auth': 'external redirect to the auth app',
  '/auth/login': 'external redirect to the auth app',
  '/auth/register': 'external redirect to the auth app',
  '/auth/forgot-password': 'external redirect to the auth app',
  '/auth/reset-password': 'external redirect to the auth app',
  '/login': 'legacy alias redirect to /auth/login',
  '/register': 'legacy alias redirect to /auth/register',
  '/forgot-password': 'legacy alias redirect to /auth/forgot-password',
  '/reset-password': 'legacy alias redirect to /auth/reset-password',
  '/welcome': 'external redirect to the landing site',
  '/battles/:slug': 'battle detail renders without the shared dashboard frame',
  '/battles/:slug/result': 'battle result page renders without the shared frame',
  '/battles/lenserboard': 'battle lenserboard renders without the shared frame',
  '/billing': 'legacy redirect to /',
  '/store': 'legacy redirect to /',
  '/lenses/:id': 'redirect to the versioned lens lab route',
  '/lenser/:handle/ag': 'redirect to /lenser/:handle/ag/overview',
  '/lenser/:handle/ag/:section':
    'generic agent workspace route — covered by the concrete agent.<section> definitions',
  '/lenser/:handle/workflows': 'short alias redirect to the agent workflows section',
  '/lenser/:handle/ov': 'short alias redirect to the agent overview section',
  '/lenser/:handle/wf': 'short alias redirect to the agent workflows section',
  '/lenser/:handle/lg': 'short alias redirect to the agent logs section',
  '/lenser/:handle/sc': 'short alias redirect to the agent schedules section',
  '/lenser/:handle/rv': 'short alias redirect to the agent runs section',
  '/lenser/:handle/ap': 'short alias redirect to the agent approvals section',
  '/lenser/:handle/me': 'short alias redirect to the agent memory section',
  '/lenser/:handle/in': 'short alias redirect to the agent instructions section',
  '/lenser/:handle/to': 'short alias redirect to the agent tools section',
  '/lenser/:handle/mo': 'short alias redirect to the agent models section',
  '/lenser/:handle/pr': 'short alias redirect to the agent providers section',
  '/lenser/:handle/by': 'short alias redirect to the agent byok section',
  '/lenser/:handle/co': 'short alias redirect to the agent cost section',
  '/lenser/:handle/st': 'short alias redirect to the agent settings section',
  '/lenser/:handle/sp': 'short alias redirect to the agent scratchpad section',
  '/lenser/:handle/tm': 'short alias redirect to the agent team section',
  '/lenser/:handle/pe': 'short alias redirect to the agent personality section',
  '/lenser/:handle/ev': 'short alias redirect to the agent evaluations section',
  '/onboarding': 'onboarding modal — no shared header, own guided flow',
  '/not-authorized': 'error page — no tour',
  '/prompts/*': 'legacy redirect to /lenses',
  '/tags/*': 'legacy redirect to /ray',
  '/rays/*': 'legacy redirect to /ray',
  '/len/*': 'legacy redirect to /ray',
  '/s/:shortId': 'short-link external redirect',
  '/settings': 'redirect to /settings/account',
  '/threads/compose': 'modal layered over the current page — that page owns the tour',
  '/tournaments/:slug': 'tournament page renders without the shared frame',
  agent: 'nested modal route under /lenser/:handle — the profile tour covers the page',
  manage: 'nested modal route under /workflows — the workflows tour covers the page',
}

function extractRoutePaths(): string[] {
  const files = [
    path.join(WEB_SRC, 'WebRouter.tsx'),
    ...fs
      .readdirSync(path.join(WEB_SRC, 'routes'))
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => path.join(WEB_SRC, 'routes', file)),
  ]
  const paths: string[] = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const routeTagPattern = /<Route\b[^>]*?\bpath="([^"]+)"/gs
    for (const match of source.matchAll(routeTagPattern)) {
      paths.push(match[1])
    }
  }
  return [...new Set(paths)]
}

/** Builds a concrete pathname from a route pattern for resolveTourForPath. */
function samplePathname(routePattern: string): string {
  return routePattern
    .replace(/:[^/]+/g, 'sample')
    .replace(/\*/g, 'sample')
    .split(/[?#]/)[0]
}

function lookupKey(locale: unknown, key: string): unknown {
  let node = locale
  for (const segment of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return node
}

const enLocale = JSON.parse(fs.readFileSync(path.join(WEB_SRC, 'locales/en.json'), 'utf8'))
const trLocale = JSON.parse(fs.readFileSync(path.join(WEB_SRC, 'locales/tr.json'), 'utf8'))

function allSteps(): Array<{ tourId: string; step: TourStep }> {
  return TOURS.flatMap((tour) =>
    [tour.steps.desktop, tour.steps.tablet ?? [], tour.steps.mobile ?? []]
      .flat()
      .map((step) => ({ tourId: tour.id, step })),
  )
}

describe('tour route coverage', () => {
  const routePaths = extractRoutePaths()

  it('extracts a sane number of routes from the router', () => {
    expect(routePaths.length).toBeGreaterThan(50)
  })

  it.each(routePaths.map((routePath) => [routePath] as const))(
    'route %s is covered by a tour or explicitly excluded',
    (routePath) => {
      if (routePath in EXCLUDED) return
      const tour = resolveTourForPath(samplePathname(routePath))
      expect(
        tour,
        `route "${routePath}" matches no tour — add a definition or an EXCLUDED entry`,
      ).toBeDefined()
    },
  )

  it('has no stale exclusions (every EXCLUDED entry still exists in the router)', () => {
    for (const excluded of Object.keys(EXCLUDED)) {
      expect(routePaths, `EXCLUDED entry "${excluded}" no longer exists in the router`).toContain(
        excluded,
      )
    }
  })
})

describe('tour registry integrity', () => {
  it('has unique tour ids', () => {
    const ids = TOURS.map((tour) => tour.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses tour.pages.* i18n keys for every step', () => {
    for (const { tourId, step } of allSteps()) {
      expect(step.titleKey, `${tourId} titleKey`).toMatch(/^tour\.pages\./)
      expect(step.bodyKey, `${tourId} bodyKey`).toMatch(/^tour\.pages\./)
    }
  })

  it('resolves every referenced key in BOTH en.json and tr.json', () => {
    for (const { tourId, step } of allSteps()) {
      for (const key of [step.titleKey, step.bodyKey]) {
        expect(lookupKey(enLocale, key), `en.json missing "${key}" (${tourId})`).toBeDefined()
        expect(lookupKey(trLocale, key), `tr.json missing "${key}" (${tourId})`).toBeDefined()
      }
    }
  })

  it('keeps Turkish copy translated (never identical to English)', () => {
    for (const { tourId, step } of allSteps()) {
      for (const key of [step.titleKey, step.bodyKey]) {
        const en = lookupKey(enLocale, key)
        const tr = lookupKey(trLocale, key)
        expect(
          typeof tr === 'string' && tr.length > 0,
          `tr.json empty for "${key}" (${tourId})`,
        ).toBe(true)
        expect(tr, `tr.json untranslated for "${key}" (${tourId})`).not.toBe(en)
      }
    }
  })
})
