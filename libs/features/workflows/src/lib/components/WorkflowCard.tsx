import { Badge, Card } from '@lenserfight/ui/components'
import { timeAgo } from '@lenserfight/utils/date'
import { motion } from 'framer-motion'
import { Bookmark, GitFork, GitBranch, Lock, Swords, ThumbsUp } from 'lucide-react'
import React from 'react'

import type { WorkflowRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'

interface WorkflowCardProps {
  workflow: WorkflowRecord
  nodes?: WorkflowNodeRecord[]
  nodeCount?: number
  compact?: boolean
  showReactions?: boolean
  onClick?: () => void
}

export function WorkflowCard({ workflow, nodes, nodeCount: nodeCountProp, compact, onClick }: WorkflowCardProps) {
  const nodeCount = nodeCountProp ?? workflow.node_count ?? nodes?.length ?? 0
  const battleCount = workflow.battle_count ?? 0
  const likeCount = (workflow.reaction_totals as Record<string, number> | null | undefined)?.like ?? 0
  const savedCount = (workflow.reaction_totals as Record<string, number> | null | undefined)?.saved ?? 0
  const forkCount = workflow.fork_count ?? 0

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
            <Lock size={11} className="flex-shrink-0 text-greyscale-400" title="Private workflow" />
          )}
        </div>
        <span className="ml-auto text-xs text-greyscale-400 whitespace-nowrap">{nodeCount} lenses</span>
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
      className="hover:shadow-xl transition-shadow"
    >
      <Card
        onClick={onClick}
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
                <Lock size={12} className="flex-shrink-0 text-greyscale-400" title="Private workflow" />
              )}
            </div>
            {workflow.description && (
              <p className="mt-0.5 text-sm text-greyscale-500 line-clamp-2">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge color="blue" variant="outline">
            {nodeCount} lens{nodeCount !== 1 ? 'es' : ''}
          </Badge>
          {battleCount > 0 && (
            <Badge color="gray" variant="outline">
              <Swords size={10} className="mr-1" />
              {battleCount} battle{battleCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <span className="ml-auto text-xs text-greyscale-400">{timeAgo(workflow.created_at)}</span>
        </div>

        {battleCount > 0 && (
          <p className="text-xs text-greyscale-500 font-medium">
            Used in {battleCount} battle{battleCount !== 1 ? 's' : ''}
          </p>
        )}

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
        </div>
      </Card>
    </motion.div>
  )
}
