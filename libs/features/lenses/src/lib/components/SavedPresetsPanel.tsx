import { queryKeys } from '@lenserfight/data/cache'
import { savedPresetsRepository } from '@lenserfight/data/repositories'
import type { SavedParameterPreset } from '@lenserfight/types'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileJson, Table2, Pencil, Trash2, Play } from 'lucide-react'
import React, { useState } from 'react'

import { SavedPresetExportModal } from './SavedPresetExportModal'

interface SavedPresetsPanelProps {
  lensId: string
  lensVersionId: string
  versionParams?: Array<{ label: string }>
  onApplyPreset: (values: Record<string, unknown>) => void
}

export const SavedPresetsPanel: React.FC<SavedPresetsPanelProps> = ({
  lensVersionId,
  versionParams,
  onApplyPreset,
}) => {
  const queryClient = useQueryClient()

  const { data: presets, isLoading } = useQuery({
    queryKey: queryKeys.savedPresets.byVersion(lensVersionId),
    queryFn: () => savedPresetsRepository.listSavedPresets(lensVersionId),
    enabled: !!lensVersionId,
  })

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<SavedParameterPreset | null>(null)
  const [editName, setEditName] = useState('')
  const [exportTarget, setExportTarget] = useState<SavedParameterPreset | null>(null)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')

  const deleteMutation = useMutation({
    mutationFn: (id: string) => savedPresetsRepository.deleteSavedPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.savedPresets.byVersion(lensVersionId),
      })
      setDeleteTargetId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      savedPresetsRepository.updateSavedPreset(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.savedPresets.byVersion(lensVersionId),
      })
      setEditTarget(null)
    },
  })

  const handleOpenExport = (preset: SavedParameterPreset, format: 'json' | 'csv') => {
    setExportTarget(preset)
    setExportFormat(format)
  }

  const handleOpenEdit = (preset: SavedParameterPreset) => {
    setEditTarget(preset)
    setEditName(preset.name)
  }

  const handleSaveEdit = () => {
    if (!editTarget || !editName.trim()) return
    updateMutation.mutate({ id: editTarget.id, name: editName.trim() })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400 uppercase tracking-wide">
        Saved presets
      </p>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-surface-raised animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && (!presets || presets.length === 0) && (
        <p className="text-sm text-greyscale-400 dark:text-greyscale-500">
          No saved presets for this version.
        </p>
      )}

      {!isLoading && presets && presets.length > 0 && (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-surface-border bg-surface-base px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
                  {preset.name}
                </p>
                {preset.note && (
                  <p className="text-xs text-greyscale-500 dark:text-greyscale-400 truncate mt-0.5">
                    {preset.note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onApplyPreset(preset.values as Record<string, unknown>)}
                  title="Load preset"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-primary-yellow-600 hover:bg-primary-yellow-500/10 transition-colors"
                >
                  <Play size={12} />
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(preset)}
                  title="Rename preset"
                  className="p-1.5 rounded-lg text-greyscale-500 hover:text-greyscale-700 hover:bg-surface-raised dark:hover:text-greyscale-300 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExport(preset, 'json')}
                  title="Export as JSON"
                  className="p-1.5 rounded-lg text-greyscale-500 hover:text-greyscale-700 hover:bg-surface-raised dark:hover:text-greyscale-300 transition-colors"
                >
                  <FileJson size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExport(preset, 'csv')}
                  title="Export as CSV"
                  className="p-1.5 rounded-lg text-greyscale-500 hover:text-greyscale-700 hover:bg-surface-raised dark:hover:text-greyscale-300 transition-colors"
                >
                  <Table2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(preset.id)}
                  title="Delete preset"
                  className="p-1.5 rounded-lg text-greyscale-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title="Delete preset?"
        bodyText="This preset will be permanently removed."
        variant="destructive"
        confirmAction={{
          label: 'Delete',
          onClick: () => deleteTargetId && deleteMutation.mutate(deleteTargetId),
          loading: deleteMutation.isPending,
        }}
      />

      {/* Inline rename dialog */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditTarget(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
              Rename preset
            </h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-3 py-1.5 text-xs font-medium text-greyscale-600 rounded-lg hover:bg-surface-raised transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editName.trim() || updateMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-primary-yellow-500 text-greyscale-900 rounded-lg hover:bg-primary-yellow-600 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {exportTarget && (
        <SavedPresetExportModal
          isOpen={!!exportTarget}
          onClose={() => setExportTarget(null)}
          preset={exportTarget}
          format={exportFormat}
          versionParams={versionParams}
        />
      )}
    </div>
  )
}
