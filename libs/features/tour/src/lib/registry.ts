import { matchPath } from 'react-router-dom'

import { TOURS } from './definitions'

import type { TourDefinition, TourDeviceClass, TourStep } from './types'

/**
 * Resolves the tour definition for a pathname by matching it against each
 * definition's react-router route patterns. The first matching definition wins.
 */
export function resolveTourForPath(
  pathname: string,
  tours: TourDefinition[] = TOURS,
): TourDefinition | undefined {
  for (const def of tours) {
    for (const pattern of def.routePatterns) {
      if (matchPath(pattern, pathname)) return def
    }
  }
  return undefined
}

/**
 * Picks the step list for a device class, falling back mobile → tablet → desktop
 * and tablet → desktop.
 */
export function getTourSteps(def: TourDefinition, device: TourDeviceClass): TourStep[] {
  if (device === 'mobile') {
    return def.steps.mobile ?? def.steps.tablet ?? def.steps.desktop
  }
  if (device === 'tablet') {
    return def.steps.tablet ?? def.steps.desktop
  }
  return def.steps.desktop
}
