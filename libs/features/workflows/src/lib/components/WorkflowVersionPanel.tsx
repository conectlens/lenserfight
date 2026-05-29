import type { WorkflowVersionRecord } from '@lenserfight/data/repositories'
import { Archive, Check, Clock, GitBranch, GitCompare, RotateCcw, Upload } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import {
  useWorkflowVersions,
  useCreateWorkflowVersion,
  usePublishWorkflowVersion,
  useRestoreWorkflowVersion,
} from '../hooks/useWorkflowVersions'

import { WorkflowVersionDiff, type WorkflowVersion } from './WorkflowVersionDiff'

interface WorkflowVersionPanelProps {
  workflowId: string
  isOwner: boolean
}

const statusIcon: Record<string, React.ReactNode> = {
  draft: <Clock size={12} className="text-yellow-500" />,
  published: <Check size={12} className="text-green-500" />,
  archived: <Archive size={12} className="text-greyscale-400" />,
}

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

export function WorkflowVersionPanel({ workflowId, isOwner }: WorkflowVersionPanelProps) {
  const { data: versions, isLoading } = useWorkflowVersions(workflowId)
  const { mutate: createVersion, isPending: isCreating } = useCreateWorkflowVersion(workflowId)
  const { mutate: publishVersion, isPending: isPublishing } = usePublishWorkflowVersion(workflowId)
  const { mutate: restoreVersion, isPending: isRestoring } = useRestoreWorkflowVersion(workflowId)
  const [changelog, setChangelog] = useState('')
  const [compareTarget, setCompareTarget] = useState<WorkflowVersionRecord | null>(null)

  const publishedVersion = useMemo(
    () => (versions ?? []).find((v) => v.status === 'published') ?? null,
    [versions],
  )

  const handleCreateVersion = () => {
    createVersion(changelog || undefined, {
      onSuccess: () => setChangelog(''),
    })
  }

  // Snapshot bodies are not on WorkflowVersionRecord; loading them requires
  // fn_get_workflow_version_snapshot (post-launch Phase 3). The diff renders
  // an explanatory "snapshot data unavailable" hint when both sides are empty.
  const diffPair = compareTarget && publishedVersion
    ? {
        a: { ...compareTarget, snapshot: { nodes: [], edges: [] } } satisfies WorkflowVersion,
        b: { ...publishedVersion, snapshot: { nodes: [], edges: [] } } satisfies WorkflowVersion,
      }
    : null

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-greyscale-700 dark:text-greyscale-200">
        <GitBranch size={14} />
        Versions
      </div>

      {/* Create new version */}
      {isOwner && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Changelog (optional)"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-xs text-greyscale-900 dark:text-greyscale-100 placeholder:text-greyscale-400"
          />
          <button
            onClick={handleCreateVersion}
            disabled={isCreating}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-greyscale-700 dark:text-greyscale-200 transition-colors hover:bg-surface-base disabled:opacity-50"
          >
            <GitBranch size={12} />
            {isCreating ? 'Saving…' : 'Save Version'}
          </button>
        </div>
      )}

      {/* Version list */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-raised animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {(versions ?? []).map((v: WorkflowVersionRecord) => (
            <VersionCard
              key={v.id}
              version={v}
              isOwner={isOwner}
              canCompare={!!publishedVersion && publishedVersion.id !== v.id}
              onPublish={() => publishVersion(v.id)}
              onRestore={() => restoreVersion(v.id)}
              onCompare={() => setCompareTarget(v)}
              isPublishing={isPublishing}
              isRestoring={isRestoring}
            />
          ))}
          {(versions ?? []).length === 0 && (
            <p className="text-xs text-greyscale-400 text-center py-4">
              No versions saved yet
            </p>
          )}
        </div>
      )}

      {diffPair && (
        <WorkflowVersionDiff
          workflowId={workflowId}
          versionA={diffPair.a}
          versionB={diffPair.b}
          open={!!compareTarget}
          onOpenChange={(b) => !b && setCompareTarget(null)}
        />
      )}
    </div>
  )
}

interface VersionCardProps {
  version: WorkflowVersionRecord
  isOwner: boolean
  canCompare: boolean
  onPublish: () => void
  onRestore: () => void
  onCompare: () => void
  isPublishing: boolean
  isRestoring: boolean
}

function VersionCard({ version, isOwner, canCompare, onPublish, onRestore, onCompare, isPublishing, isRestoring }: VersionCardProps) {
  const date = new Date(version.created_at)
  const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-base p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-semibold text-greyscale-900 dark:text-greyscale-100">
            v{version.version_number}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-surface-raised px-1.5 py-0.5 text-[10px]">
            {statusIcon[version.status]}
            {statusLabel[version.status]}
          </span>
        </div>
        <span className="text-greyscale-400">{formattedDate} {formattedTime}</span>
      </div>

      {version.changelog && (
        <p className="text-greyscale-500 dark:text-greyscale-400 line-clamp-2">
          {version.changelog}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-greyscale-400">
        <span>{version.node_count} nodes</span>
        <span>{version.edge_count} edges</span>
      </div>

      {isOwner && (
        <div className="flex gap-1.5">
          {version.status === 'draft' && (
            <button
              onClick={onPublish}
              disabled={isPublishing}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              <Upload size={10} />
              Publish
            </button>
          )}
          <button
            onClick={onRestore}
            disabled={isRestoring}
            className="flex items-center gap-1 rounded-md bg-surface-raised px-2 py-1 text-[10px] font-medium text-greyscale-600 dark:text-greyscale-300 hover:bg-surface-border disabled:opacity-50"
          >
            <RotateCcw size={10} />
            Restore
          </button>
          {canCompare && (
            <button
              onClick={onCompare}
              className="flex items-center gap-1 rounded-md bg-surface-raised px-2 py-1 text-[10px] font-medium text-greyscale-600 dark:text-greyscale-300 hover:bg-surface-border"
              aria-label="Compare to current"
            >
              <GitCompare size={10} />
              Compare
            </button>
          )}
        </div>
      )}
    </div>
  )
}
