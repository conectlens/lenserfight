import { AlertTriangle } from 'lucide-react'
import React from 'react'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import type { ArtifactDependencySummary, ArtifactLifecycleType } from '@lenserfight/data/repositories'

export interface ArtifactDeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  artifactType: ArtifactLifecycleType
  dependencySummary: ArtifactDependencySummary | null
  deleteMode?: 'hard_delete' | 'tombstone'
  isDeleting: boolean
}

const ARTIFACT_LABELS: Record<ArtifactLifecycleType, string> = {
  lens: 'Lens',
  workflow: 'Workflow',
  battle: 'Battle',
  agent: 'Agent',
}

export const ArtifactDeleteConfirmDialog: React.FC<ArtifactDeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  artifactType,
  dependencySummary,
  deleteMode,
  isDeleting,
}) => {
  const label = ARTIFACT_LABELS[artifactType]
  const isHardBlocked =
    !!dependencySummary?.blocking_reasons?.length && dependencySummary.blocking_reasons.length > 0
  const hasSoftDependencies =
    !isHardBlocked && dependencySummary?.has_dependencies

  const subtitle =
    deleteMode === 'tombstone'
      ? 'This artifact will be soft-deleted and remain accessible to existing references.'
      : deleteMode === 'hard_delete'
        ? 'This action is permanent and cannot be undone.'
        : 'This action cannot be undone.'

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={`Delete ${label}`}
      icon={<AlertTriangle size={18} />}
      maxWidth="max-w-md"
      footer={
        <ModalFooter
          border={false}
          leftButton={{
            label: 'Cancel',
            onClick: onClose,
            disabled: isDeleting,
            variant: 'secondary',
            className: 'flex-1',
          }}
          primaryButton={
            isHardBlocked
              ? {
                  label: "Can't delete",
                  onClick: () => {},
                  disabled: true,
                  variant: 'danger',
                  className: 'flex-1 opacity-50 cursor-not-allowed',
                }
              : {
                  label: 'Delete',
                  onClick: onConfirm,
                  isLoading: isDeleting,
                  variant: 'danger',
                  className: 'flex-1 bg-red-600 hover:bg-red-700 text-white',
                }
          }
        />
      }
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-greyscale-600 dark:text-greyscale-400 text-center">
          {subtitle}
        </p>

        {isHardBlocked && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
              This {label.toLowerCase()} cannot be deleted because it is referenced by:
            </p>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
              {dependencySummary!.blocking_reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              You can archive this {label.toLowerCase()} instead to hide it from active listings.
            </p>
          </div>
        )}

        {hasSoftDependencies && dependencySummary && (
          <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-3">
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1.5">
              This {label.toLowerCase()} has existing references:
            </p>
            <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5 list-disc list-inside">
              {Object.entries(dependencySummary.counts).map(([key, count]) => (
                <li key={key}>
                  {count} {key.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  )
}
