import { Badge, Card } from '@lenserfight/ui/components'
import { timeAgo } from '@lenserfight/utils/date'
import { ArrowRight, Bookmark, GitFork, GitBranch, Layers3, Lock, Play, ThumbsUp } from 'lucide-react'
import React from 'react'

import type { WorkflowRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'

interface WorkflowCardProps {
  workflow: WorkflowRecord
  nodes?: WorkflowNodeRecord[]
  nodeCount?: number
  compact?: boolean
  showReactions?: boolean
  onClick?: () => void
  onRun?: (e: React.MouseEvent) => void
}

export function WorkflowCard({ workflow, nodes, nodeCount: nodeCountProp, compact, onClick, onRun }: WorkflowCardProps) {
  const nodeCount = nodeCountProp ?? workflow.node_count ?? nodes?.length ?? 0
  const likeCount = (workflow.reaction_totals as Record<string, number> | null | undefined)?.like ?? 0
  const savedCount = (workflow.reaction_totals as Record<string, number> | null | undefined)?.saved ?? 0
  const forkCount = workflow.fork_count ?? 0
  const stageLabel = nodeCount > 0 ? `${nodeCount} stage${nodeCount !== 1 ? 's' : ''}` : 'Draft stages'

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised px-3 py-2 ${onClick ? 'cursor-pointer hover:border-primary-yellow-500 transition-colors' : ''}`}
      >
        <GitBranch size={14} className="text-greyscale-400 flex-shrink-0" />
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
            {workflow.title}
          </span>
          {workflow.visibility === 'private' && (
            <span title="Private workflow">
              <Lock size={11} className="flex-shrink-0 text-greyscale-400" />
            </span>
          )}
        </div>
        <span className="ml-auto text-xs text-greyscale-400 whitespace-nowrap">{nodeCount} lenses</span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`transition-all hover:-translate-y-0.5 hover:shadow-xl ${onClick ? 'cursor-pointer' : ''}`}
    >
      <Card
        className={`space-y-3 p-4 ${onClick ? 'cursor-pointer hover:border-primary-yellow-500 transition-colors' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-raised">
            <GitBranch size={16} className="text-greyscale-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold text-greyscale-900 dark:text-greyscale-50">{workflow.title}</p>
              {workflow.visibility === 'private' && (
                <span title="Private workflow">
                  <Lock size={12} className="flex-shrink-0 text-greyscale-400" />
                </span>
              )}
            </div>
            {workflow.description && (
              <p className="mt-0.5 text-sm text-greyscale-500 line-clamp-2">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge color="blue" variant="outline">
            {stageLabel}
          </Badge>
          <Badge color="green" variant="outline">
            reusable
          </Badge>
          <span className="ml-auto text-xs text-greyscale-400">{timeAgo(workflow.created_at)}</span>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-surface-border">
          <span className="flex items-center gap-1 text-xs text-greyscale-400">
            <ThumbsUp size={11} /> {likeCount}
          </span>
          <span className="flex items-center gap-1 text-xs text-greyscale-400">
            <Bookmark size={11} /> {savedCount}
          </span>
          <span className="flex items-center gap-1 text-xs text-greyscale-400">
            <GitFork size={11} /> {forkCount}
          </span>
          {onRun ? (
            <button
              type="button"
              onClick={onRun}
              className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-primary-700 dark:text-primary-yellow-400 hover:underline"
            >
              <Play size={11} /> Run workflow
            </button>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-primary-700 dark:text-primary-yellow-400">
              <Play size={11} /> Run workflow
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
