import { describe, expect, it } from 'vitest'

import { getTourSteps, resolveTourForPath } from './registry'

import type { TourDefinition, TourStep } from './types'

const step = (titleKey: string): TourStep => ({ titleKey, bodyKey: `${titleKey}.body` })

const replayTour: TourDefinition = {
  id: 'battles.replay',
  routePatterns: ['/battles/:slug/replay'],
  steps: { desktop: [step('replay.s1')] },
}

const battleDetailTour: TourDefinition = {
  id: 'battles.detail',
  routePatterns: ['/battles/:slug'],
  steps: { desktop: [step('detail.s1')] },
}

describe('resolveTourForPath', () => {
  it('matches route patterns with params', () => {
    expect(resolveTourForPath('/battles/spring-cup/replay', [replayTour])?.id).toBe(
      'battles.replay',
    )
  })

  it('returns undefined when nothing matches', () => {
    expect(resolveTourForPath('/settings/profile', [replayTour])).toBeUndefined()
  })

  it('does not over-match sibling segments', () => {
    expect(resolveTourForPath('/battles/spring-cup/replay/extra', [replayTour])).toBeUndefined()
  })

  it('first matching definition wins', () => {
    const tours = [replayTour, battleDetailTour]
    expect(resolveTourForPath('/battles/spring-cup/replay', tours)?.id).toBe('battles.replay')
  })
})

describe('getTourSteps', () => {
  const full: TourDefinition = {
    id: 'full',
    routePatterns: ['/full'],
    steps: {
      desktop: [step('d')],
      tablet: [step('t')],
      mobile: [step('m')],
    },
  }

  it('returns device-specific steps when defined', () => {
    expect(getTourSteps(full, 'mobile')[0].titleKey).toBe('m')
    expect(getTourSteps(full, 'tablet')[0].titleKey).toBe('t')
    expect(getTourSteps(full, 'desktop')[0].titleKey).toBe('d')
  })

  it('falls back mobile → tablet → desktop', () => {
    const noMobile: TourDefinition = {
      id: 'no-mobile',
      routePatterns: ['/nm'],
      steps: { desktop: [step('d')], tablet: [step('t')] },
    }
    expect(getTourSteps(noMobile, 'mobile')[0].titleKey).toBe('t')

    const desktopOnly: TourDefinition = {
      id: 'desktop-only',
      routePatterns: ['/do'],
      steps: { desktop: [step('d')] },
    }
    expect(getTourSteps(desktopOnly, 'mobile')[0].titleKey).toBe('d')
    expect(getTourSteps(desktopOnly, 'tablet')[0].titleKey).toBe('d')
  })
})
