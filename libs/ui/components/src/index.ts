export * from './lib/ActionMenu'
export * from './lib/Avatar'
export * from './lib/Breadcrumbs'
export * from './lib/Button'
// AppButton moved to @lenserfight/features/shell — re-exported for backward compat
// NOTE: importing from @lenserfight/ui/components still works, but new code should
// import directly from @lenserfight/features/shell to respect layer boundaries.
export * from './lib/Card'
export * from './lib/DangerZone'
export * from './lib/FormError'
export * from './lib/DesktopFrame'
export * from './lib/LoadingOverlay'
export * from './lib/MentionRenderer'
export * from './lib/MermaidDiagram'
export * from './lib/SEOHead'
// `export *` does not re-export `default`, so expose this as a named export.
export { default as StarBackground } from './lib/StarBackground'
export * from './lib/Table'
export * from './lib/TagBadge'
export * from './lib/LanguageSelectBox'
export * from './lib/StepWizard'
export * from './lib/UserCard'
export * from './lib/components'
export { InfiniteScrollSentinel } from './lib/pagination/InfiniteScrollSentinel'
export { Paginator } from './lib/pagination/Paginator'

// UIProvider, useUI, AppToaster, ActionItem — moved to @lenserfight/ui/providers.
// Re-exported here for backward compat; new code should import from providers directly.
export { UIProvider, useUI } from '@lenserfight/ui/providers'
export type { ActionItem } from '@lenserfight/ui/providers'
export { AppToaster } from '@lenserfight/ui/providers'

// Lens system badges
export * from './lib/VersionBadge'
export * from './lib/ModelProviderBadge'

// Brand components
export * from './lib/Alert'
export * from './lib/Badge'
export * from './lib/Tooltip'
export * from './lib/Progress'
export * from './lib/Accordion'
export * from './lib/Skeleton'
export * from './lib/Dropdown'
export * from './lib/ErrorPage'
