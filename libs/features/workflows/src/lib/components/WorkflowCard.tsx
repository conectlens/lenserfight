import { Badge, Card } from '@lenserfight/ui/components'
import { timeAgo } from '@lenserfight/utils/date'
import { GitBranch, Swords } from 'lucide-react'
import React from 'react'

import type { WorkflowRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'

interface WorkflowCardProps {
  workflow: WorkflowRecord
  nodes?: WorkflowNodeRecord[]
  compact?: boolean
  onClick?: () => void
}

export function WorkflowCard({ workflow, nodes, compact, onClick }: WorkflowCardProps) {
  const nodeCount = nodes?.length ?? 0
  const battleCount = workflow.battle_count ?? 0

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised px-3 py-2 ${onClick ? 'cursor-pointer hover:border-status-blue transition-colors' : ''}`}
      >
        <GitBranch size={14} className="text-greyscale-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">{workflow.title}</span>
        <span className="ml-auto text-xs text-greyscale-400 whitespace-nowrap">{nodeCount} lenses</span>
      </div>
    )
  }

  return (
    <Card
      onClick={onClick}
      className={`space-y-3 p-5 ${onClick ? 'cursor-pointer hover:border-status-blue transition-colors' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-raised">
          <GitBranch size={16} className="text-greyscale-400" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">{workflow.title}</p>
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
    </Card>
  )
}
