export * from './lib/ActionMenu'
export * from './lib/Avatar'
export * from './lib/LenserDnaAvatar'
export * from './lib/Breadcrumbs'
export * from './lib/Button'
export * from './lib/Card'
export * from './lib/DangerZone'
export * from './lib/FormError'
export * from './lib/DesktopFrame'
export { Loader, LoadingOverlay } from '@lenserfight/ui/feedback'
export type { LoaderProps, LoaderVariant } from '@lenserfight/ui/feedback'
export * from './lib/MentionRenderer'
export * from './lib/MermaidDiagram'
export * from './lib/SEOHead'
export * from './lib/SegmentedControl'
// `export *` does not re-export `default`, so expose this as a named export.
export { default as StarBackground } from './lib/StarBackground'
export * from './lib/Table'
export * from './lib/TagBadge'
export * from './lib/LanguageSelectBox'
export * from './lib/StepIndicator'
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

// Logo
export * from './lib/Logo'

// Brand components
export * from './lib/Alert'
export * from './lib/Badge'
export * from './lib/Tooltip'
export * from './lib/Progress'
export * from './lib/Accordion'
export * from './lib/Skeleton'
export * from './lib/Dropdown'
export * from './lib/ErrorPage'
// PageHeader is owned by @lenserfight/ui/layout — re-exported here for backward compat.
export { PageHeader } from '@lenserfight/ui/layout'
export type { PageHeaderProps } from '@lenserfight/ui/layout'
export * from './lib/EmptyState'
export * from './lib/HelpButton'
export * from './lib/useDocsLocale'
export * from './lib/MarkdownRenderer'
export * from './lib/StreamingOutput'
export * from './lib/AiLenserFamily'
export * from './lib/XCarousel'
