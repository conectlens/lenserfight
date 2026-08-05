export type TourDeviceClass = 'desktop' | 'tablet' | 'mobile'

export interface TourStep {
  /** CSS selector, convention: [data-tour="<anchor>"]; omitted or unresolved → centered card */
  target?: string
  /** i18n key for the step title */
  titleKey: string
  /** i18n key for the step body */
  bodyKey: string
  /** Preferred bubble placement relative to the target. Defaults to 'bottom'. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** State-aware steps: skip silently when the target is absent from the document */
  skipIfTargetMissing?: boolean
}

export interface TourDefinition {
  /** Stable id, persisted as the seen-marker, e.g. 'dashboard.home' */
  id: string
  /** react-router route patterns, e.g. '/battles/:slug/replay' */
  routePatterns: string[]
  steps: {
    desktop: TourStep[]
    tablet?: TourStep[]
    mobile?: TourStep[]
  }
}
