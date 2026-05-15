import type { AgentTeamEdgeType } from '@lenserfight/types'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Crown, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import React from 'react'
import { Button } from '@lenserfight/ui/components'


export type AgentNodeStatus = 'idle' | 'running' | 'waiting' | 'failed' | 'completed'
export type AgentNodeRole = 'leader' | 'executor' | 'reviewer' | 'operator' | 'observer'

export interface AgentNodeData extends Record<string, unknown> {
  label: string
  sublabel?: string
  agentHandle?: string
  isLead?: boolean
  status?: AgentNodeStatus
  role?: AgentNodeRole
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
}

const ROLE_BADGE: Record<AgentNodeRole, string> = {
  leader:   'bg-primary-yellow-100 text-primary-yellow-700 dark:bg-primary-yellow-900/40 dark:text-primary-yellow-300',
  executor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  reviewer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  operator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  observer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const STATUS_BORDER: Record<AgentNodeStatus, string> = {
  idle:      '',
  running:   'animate-pulse border-primary-yellow-400 dark:border-primary-yellow-500',
  waiting:   'border-gray-400 dark:border-gray-500',
  failed:    'border-red-400 dark:border-red-500',
  completed: 'border-emerald-400 dark:border-emerald-500',
}

export const AgentCanvasNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as AgentNodeData
  const role = d.role as AgentNodeRole | undefined
  const status = (d.status ?? 'idle') as AgentNodeStatus
  const statusBorder = status !== 'idle' ? STATUS_BORDER[status] : ''

  return (
    <div
      className={[
        'group relative min-w-[200px] rounded-2xl border bg-white px-4 py-3 shadow-sm transition-all dark:bg-gray-900',
        selected
          ? 'border-primary-yellow-400 shadow-primary-yellow-200/60 ring-2 ring-primary-yellow-400/30 dark:border-primary-yellow-500 dark:shadow-primary-yellow-500/20'
          : statusBorder || 'border-gray-200 dark:border-gray-700',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary-yellow-500" />

      {/* Lead indicator */}
      {d.isLead && (
        <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-primary-yellow-400 shadow-sm">
          <Crown size={10} className="text-white" />
        </span>
      )}

      {/* Hover action toolbar */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 shadow-md group-hover:flex dark:border-gray-700 dark:bg-gray-900">
        {d.onEdit && (
          <Button
            type="button"
            title="Edit member"
            onClick={(e) => { e.stopPropagation(); d.onEdit!(id) }}
            className="rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <Pencil size={12} />
          </Button>
        )}
        {d.agentHandle && (
          <a
            href={`/lenser/${d.agentHandle}/ag/overview`}
            title="View agent"
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ExternalLink size={12} />
          </a>
        )}
        {d.onRemove && (
          <Button
            type="button"
            title="Remove member"
            onClick={(e) => { e.stopPropagation(); d.onRemove!(id) }}
            className="rounded-lg p-1 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>

      <p className="max-w-[180px] truncate text-sm font-semibold text-gray-900 dark:text-white">
        {d.label}
      </p>
      {d.sublabel && (
        <p className="mt-0.5 max-w-[180px] truncate text-xs text-gray-500 dark:text-gray-400">
          {d.sublabel}
        </p>
      )}
      {d.agentHandle && (
        <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-primary-yellow-600 dark:text-primary-yellow-400">
          @{d.agentHandle}
        </p>
      )}
      {role && (
        <span className={['mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', ROLE_BADGE[role]].join(' ')}>
          {role}
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary-yellow-500" />
    </div>
  )
}

// Re-export edge type for use in AgentEdgeLine
export type { AgentTeamEdgeType }
