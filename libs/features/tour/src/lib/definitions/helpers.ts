import type { TourDefinition, TourStep } from '../types'

/** A step without its i18n keys — keys are derived from the tour id and step index. */
export type StepSpec = Omit<TourStep, 'titleKey' | 'bodyKey'>

const applyKeys = (prefix: string, specs: StepSpec[]): TourStep[] =>
  specs.map((spec, index) => ({
    ...spec,
    titleKey: `${prefix}.steps.${index}.title`,
    bodyKey: `${prefix}.steps.${index}.body`,
  }))

/**
 * Builds a tour definition whose step i18n keys follow the convention
 * `tour.pages.<tourId>[.<device>].steps.<n>.title|body`, keeping definitions
 * and locale files mechanically aligned.
 */
export function defineTour(
  id: string,
  routePatterns: string[],
  desktop: StepSpec[],
  overrides?: { tablet?: StepSpec[]; mobile?: StepSpec[] },
): TourDefinition {
  const base = `tour.pages.${id}`
  return {
    id,
    routePatterns,
    steps: {
      desktop: applyKeys(base, desktop),
      ...(overrides?.tablet ? { tablet: applyKeys(`${base}.tablet`, overrides.tablet) } : {}),
      ...(overrides?.mobile ? { mobile: applyKeys(`${base}.mobile`, overrides.mobile) } : {}),
    },
  }
}
