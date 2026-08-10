import { Archive, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import type { ArtifactLifecycleStatus, ArtifactLifecycleType } from '@lenserfight/data/repositories'
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
  /**
   * Pre-resolved status, for lists that fetched every row's status in one batch.
   * When supplied this menu does not issue its own request — which is the point:
   * rendering N menus each with its own query is N round-trips to paint N badges.
   *
   * Passed down rather than seeded into the query cache because the two race.
   * Menus mount and fire their queries in the same render pass that starts the
   * batch, so a cache write that lands after the batch resolves is already too
   * late to prevent the individual fetches.
   */
  status?: ArtifactLifecycleStatus
  extraInvalidateKeys?: QueryKey[]
  onDeleted?: () => void
  className?: string
}

export const ArtifactLifecycleMenu: React.FC<ArtifactLifecycleMenuProps> = ({
  type,
  id,
  status: providedStatus,
  extraInvalidateKeys,
  onDeleted,
  className,
}) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { data: fetchedStatus } = useArtifactLifecycleStatus(type, id, {
    enabled: providedStatus === undefined,
  })
  const status = providedStatus ?? fetchedStatus

  const archiveMutation = useArchiveArtifact()
  const restoreMutation = useRestoreArtifact()
  const pinMutation = usePinArtifact()
  const deleteMutation = useDeleteArtifact()

  const isArchived = !!status?.archived_at
  const isPinned = !!status?.pinned

  // Battle-specific: only draft battles can be archived
  const isBattleArchiveBlocked = type === 'battle' && status?.state !== 'draft'

  const archiveDisabledReason = isArchived
    ? 'Already archived.'
    : isBattleArchiveBlocked
      ? 'Battles can only be archived before they start.'
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
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => setIsDeleteOpen(true),
      variant: 'danger' as const,
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
