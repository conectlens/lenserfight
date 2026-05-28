import { useState, useCallback } from 'react'
import { useLensVersionDetail } from './useLensVersions'
import type { LensVersion } from '@lenserfight/types'

export interface UseVersionExecutionReturn {
  /** The version id that should be pinned for the next execution. Null = use latest. */
  previewVersionId: string | null
  /** The hydrated version object for the selected previewVersionId. */
  previewVersion: LensVersion | null | undefined
  isLoadingPreview: boolean
  /**
   * Pin a specific version for the next execution (restore & run flow).
   * Call with the versionId from the timeline "Restore & Run" button.
   */
  restoreAndExecute: (versionId: string) => void
  /** Clear the pin and return to latest-version execution. */
  clearRestore: () => void
}

/**
 * Orchestrates the "select a previous version → execute it" flow.
 *
 * GRASP: Pure Fabrication — no ownership overlap with lens detail or lab controller.
 * Sits between timeline (which calls `restoreAndExecute`) and LabExecutionPanel
 * (which receives `previewVersionId` to pin execution to a specific version body).
 */
export function useVersionExecution(): UseVersionExecutionReturn {
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)

  const { data: previewVersion, isLoading: isLoadingPreview } = useLensVersionDetail(previewVersionId)

  const restoreAndExecute = useCallback((versionId: string) => {
    setPreviewVersionId(versionId)
  }, [])

  const clearRestore = useCallback(() => {
    setPreviewVersionId(null)
  }, [])

  return {
    previewVersionId,
    previewVersion: previewVersionId ? previewVersion : null,
    isLoadingPreview,
    restoreAndExecute,
    clearRestore,
  }
}
