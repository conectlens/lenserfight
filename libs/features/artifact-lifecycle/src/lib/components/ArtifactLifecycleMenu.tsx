import { Archive, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import type { ArtifactLifecycleType } from '@lenserfight/data/repositories'
import { ActionMenu } from '@lenserfight/ui/components'
import { useArtifactLifecycleStatus } from '../hooks/useArtifactLifecycleStatus'
import { useArchiveArtifact } from '../hooks/useArchiveArtifact'
import { useDeleteArtifact } from '../hooks/useDeleteArtifact'
import { usePinArtifact } from '../hooks/usePinArtifact'
import { useRestoreArtifact } from '../hooks/useRestoreArtifact'
import { ArtifactDeleteConfirmDialog } from './ArtifactDeleteConfirmDialog'

export interface ArtifactLifecycleMenuProps {
  type: ArtifactLifecycleType
  id: string
  extraInvalidateKeys?: QueryKey[]
  onDeleted?: () => void
  className?: string
}

export const ArtifactLifecycleMenu: React.FC<ArtifactLifecycleMenuProps> = ({
  type,
  id,
  extraInvalidateKeys,
  onDeleted,
  className,
}) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { data: status } = useArtifactLifecycleStatus(type, id)

  const archiveMutation = useArchiveArtifact()
  const restoreMutation = useRestoreArtifact()
  const pinMutation = usePinArtifact()
  const deleteMutation = useDeleteArtifact()

  const isArchived = !!status?.archived_at
  const isPinned = !!status?.pinned
  const blockingReasons = status?.dependency_summary?.blocking_reasons ?? []
  const isDeleteBlocked = blockingReasons.length > 0

  // Battle-specific: only draft battles can be archived
  const isBattleArchiveBlocked = type === 'battle' && status?.state !== 'draft'

  const archiveDisabledReason = isArchived
    ? 'Already archived.'
    : isBattleArchiveBlocked
      ? 'Battles can only be archived before they start.'
      : null

  const deleteDisabledReason = isDeleteBlocked
    ? `Cannot delete: referenced by ${blockingReasons.join(', ')}. Archive instead.`
    : null

  const actions = [
    ...(isArchived
      ? [
          {
            label: 'Restore',
            icon: <RotateCcw size={14} />,
            onClick: () =>
              restoreMutation.mutate({ type, id, extraInvalidateKeys }),
          },
        ]
      : [
          {
            label: archiveDisabledReason ? `Archive (${archiveDisabledReason})` : 'Archive',
            icon: <Archive size={14} />,
            onClick: () => {
              if (!archiveDisabledReason) {
                archiveMutation.mutate({ type, id, extraInvalidateKeys })
              }
            },
            variant: archiveDisabledReason ? ('default' as const) : ('default' as const),
          },
        ]),
    {
      label: isPinned ? 'Unpin' : 'Pin',
      icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
      onClick: () =>
        pinMutation.mutate({ type, id, pinned: !isPinned, extraInvalidateKeys }),
    },
    {
      label: deleteDisabledReason ? `Delete (blocked)` : 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => {
        if (!deleteDisabledReason) {
          setIsDeleteOpen(true)
        }
      },
      variant: deleteDisabledReason ? ('default' as const) : ('danger' as const),
    },
  ]

  return (
    <span className={className}>
      <ActionMenu actions={actions} />
      <ArtifactDeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate({
            type,
            id,
            extraInvalidateKeys,
            onDeleted: () => {
              setIsDeleteOpen(false)
              onDeleted?.()
            },
          })
        }}
        artifactType={type}
        dependencySummary={status?.dependency_summary ?? null}
        deleteMode={status?.delete_mode}
        isDeleting={deleteMutation.isPending}
      />
    </span>
  )
}
