import React, { useCallback } from 'react'
import { Drawer } from '@lenserfight/ui/overlays'
import { Button } from '@lenserfight/ui/components'
import { Plus } from 'lucide-react'

import { LensVersionHistoryPanel } from './LensVersionHistoryPanel'
import { useLensVersionsPaginated, useLensVersions } from '../hooks/useLensVersions'

export interface LensVersionHistoryDrawerProps {
  lensId: string
  open: boolean
  onClose: () => void
  /** ID of the version currently active in the editor, highlighted in the list. */
  selectedVersionId: string | null
  onVersionSelect: (versionId: string) => void
  isOwner: boolean
}

/**
 * Drawer that displays the full paginated version history for a Lens.
 * Combines the Drawer shell from libs/ui/overlays with the
 * LensVersionHistoryPanel and its mutation actions (create / publish).
 */
export const LensVersionHistoryDrawer: React.FC<LensVersionHistoryDrawerProps> = ({
  lensId,
  open,
  onClose,
  selectedVersionId,
  onVersionSelect,
  isOwner,
}) => {
  const { versions, isLoading, isFetchingMore, hasMore, sentinelRef } =
    useLensVersionsPaginated(lensId, { enabled: open })

  const { createVersion, isCreating, publishVersion, isPublishing } =
    useLensVersions(lensId, { enabled: open })

  const handleCreateVersion = useCallback(async () => {
    await createVersion({ lensId, templateBody: '', changelog: '' })
  }, [createVersion, lensId])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Version History"
      side="right"
      width="w-96"
      headerExtra={
        isOwner ? (
          <Button
            variant="ghost"
            className="!w-auto !p-1.5 text-greyscale-500 hover:text-greyscale-900 dark:hover:text-white"
            onClick={handleCreateVersion}
            disabled={isCreating}
            aria-label="Create new version"
          >
            <Plus size={16} />
          </Button>
        ) : undefined
      }
    >
      <LensVersionHistoryPanel
        versions={versions}
        selectedVersionId={selectedVersionId}
        onVersionSelect={(id) => {
          onVersionSelect(id)
          onClose()
        }}
        onCreateVersion={handleCreateVersion}
        onPublishVersion={publishVersion}
        isPublishing={isPublishing}
        isOwner={isOwner}
        isLoading={isLoading}
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}
        sentinelRef={sentinelRef}
      />
    </Drawer>
  )
}
