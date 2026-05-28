import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MultimodalRunResult } from '../components/MultimodalRunResult'
import type { ManifestEntry } from '../components/MultimodalRunResult'
import { supabase } from '@lenserfight/data/supabase'

export function WorkflowRunMediaPage() {
  const { runId } = useParams<{ workflowId: string; runId: string }>()
  const [manifest, setManifest] = useState<ManifestEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) return

    supabase
      .rpc('fn_get_workflow_run_media_manifest', { p_run_id: runId })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
          return
        }
        const row = Array.isArray(data) ? data[0] : data
        setManifest((row?.media_manifest as ManifestEntry[] | null) ?? [])
      })
  }, [runId])

  if (error) {
    return (
      <div className="p-6 text-red-500 dark:text-red-400">
        Failed to load media manifest: {error}
      </div>
    )
  }

  if (manifest === null) {
    return (
      <div className="p-6 text-sm text-greyscale-500 dark:text-greyscale-400 animate-pulse">
        Loading media…
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-lg font-semibold text-greyscale-900 dark:text-greyscale-100 mb-4">
        Run Media
      </h1>
      <MultimodalRunResult manifest={manifest} />
    </div>
  )
}
