import React, { useState } from 'react'
import { Plus, Check, Clock, Loader2 } from 'lucide-react'
import { Button, Badge } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { LensVersion } from '@lenserfight/types'

interface LensVersionHistoryPanelProps {
  versions: LensVersion[]
  selectedVersionId: string | null
  onVersionSelect: (versionId: string) => void
  onCreateVersion: () => void
  onPublishVersion: (versionId: string) => void
  isPublishing: boolean
  isOwner: boolean
  isLoading?: boolean
  hasMore?: boolean
  isFetchingMore?: boolean
  sentinelRef?: (node: HTMLDivElement | null) => void
}

export const LensVersionHistoryPanel: React.FC<LensVersionHistoryPanelProps> = ({
  versions,
  selectedVersionId,
  onVersionSelect,
  onCreateVersion,
  onPublishVersion,
  isPublishing,
  isOwner,
  isLoading,
  hasMore,
  isFetchingMore,
  sentinelRef,
}) => {
  const [publishTargetId, setPublishTargetId] = useState<string | null>(null)

  const handleConfirmPublish = () => {
    if (publishTargetId) {
      onPublishVersion(publishTargetId)
      setPublishTargetId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 mt-8">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Versions</h4>
        {isOwner && (
          <Button
            variant="ghost"
            className="!w-auto !p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            onClick={onCreateVersion}
          >
            <Plus size={16} />
          </Button>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
          No versions yet.
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => {
            const isSelected = version.id === selectedVersionId
            const isDraft = version.status === 'draft'
            return (
              <button
                key={version.id}
                type="button"
                onClick={() => onVersionSelect(version.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">
                      v{version.versionNumber}
                    </span>
                    <Badge
                      variant={isDraft ? 'outline' : 'solid'}
                      className={`text-[10px] ${
                        isDraft
                          ? 'border-amber-300 text-amber-700 dark:text-amber-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
                      }`}
                    >
                      {isDraft ? 'Draft' : 'Published'}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {version.changelog && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {version.changelog}
                  </p>
                )}
                {version.parameterCount != null && version.parameterCount > 0 && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 inline-block">
                    {version.parameterCount} param{version.parameterCount > 1 ? 's' : ''}
                  </span>
                )}
                {isOwner && isDraft && (
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      className="!w-auto !py-1 !px-3 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPublishTargetId(version.id)
                      }}
                    >
                      <Check size={12} className="mr-1" />
                      Publish
                    </Button>
                  </div>
                )}
              </button>
            )
          })}
          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-4" />}
          {isFetchingMore && (
            <div className="flex justify-center py-2">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!publishTargetId}
        onClose={() => setPublishTargetId(null)}
        onConfirm={handleConfirmPublish}
        title="Publish Version"
        message="Publishing makes this version immutable and available for execution. Draft parameters will be locked. Continue?"
        confirmLabel="Publish"
        isLoading={isPublishing}
      />
    </div>
  )
}
