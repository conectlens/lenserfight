// Hooks
export { useArtifactLifecycleStatus } from './lib/hooks/useArtifactLifecycleStatus'
export { useArchiveArtifact } from './lib/hooks/useArchiveArtifact'
export { useRestoreArtifact } from './lib/hooks/useRestoreArtifact'
export { useDeleteArtifact } from './lib/hooks/useDeleteArtifact'
export { usePinArtifact } from './lib/hooks/usePinArtifact'

// Components
export { ArtifactLifecycleStatusBadge } from './lib/components/ArtifactLifecycleStatusBadge'
export type { ArtifactLifecycleStatusBadgeProps } from './lib/components/ArtifactLifecycleStatusBadge'
export { ArtifactLifecycleMenu } from './lib/components/ArtifactLifecycleMenu'
export type { ArtifactLifecycleMenuProps } from './lib/components/ArtifactLifecycleMenu'
export { ArtifactDeleteConfirmDialog } from './lib/components/ArtifactDeleteConfirmDialog'
export type { ArtifactDeleteConfirmDialogProps } from './lib/components/ArtifactDeleteConfirmDialog'

// Re-export types consumers need when wiring props
export type {
  ArtifactLifecycleType,
  ArtifactLifecycleStatus,
  ArtifactDependencySummary,
} from '@lenserfight/data/repositories'
