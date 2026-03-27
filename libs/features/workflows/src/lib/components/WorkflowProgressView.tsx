import { Badge } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader, Clock } from 'lucide-react'
import React from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'

interface WorkflowProgressViewProps {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  nodeResults: WorkflowNodeResultRecord[]
}

const STATUS_ICONS = {
  pending: <Clock size={14} className="text-greyscale-400" />,
  running: <Loader size={14} className="text-status-blue animate-spin" />,
  completed: <CheckCircle size={14} className="text-status-green" />,
  failed: <XCircle size={14} className="text-status-red" />,
}

const STATUS_COLORS = {
  pending: 'border-surface-border bg-surface-base',
  running: 'border-status-blue bg-status-blue/5',
  completed: 'border-status-green bg-status-green/5',
  failed: 'border-status-red bg-status-red/5',
}

export function WorkflowProgressView({ nodes, nodeResults }: WorkflowProgressViewProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-greyscale-400">
        No nodes in this workflow.
      </div>
    )
  }

  const getResult = (nodeId: string) => nodeResults.find((r) => r.node_id === nodeId)

  return (
    <div className="space-y-3 p-4">
      {nodes
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((node) => {
          const result = getResult(node.id)
          const status = result?.status ?? 'pending'
          const isRunning = status === 'running'

          return (
            <motion.div
              key={node.id}
              className={`relative rounded-2xl border p-4 transition-colors ${STATUS_COLORS[status]}`}
              animate={isRunning ? { boxShadow: ['0 0 0 0 rgba(40,123,255,0)', '0 0 0 6px rgba(40,123,255,0.15)', '0 0 0 0 rgba(40,123,255,0)'] } : {}}
              transition={isRunning ? { duration: 1.5, repeat: Infinity } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised text-xs font-bold text-greyscale-500">
                  {node.ordinal + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
                    {node.label || `Node ${node.ordinal + 1}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_ICONS[status]}
                  <Badge
                    color={status === 'completed' ? 'green' : status === 'failed' ? 'red' : status === 'running' ? 'blue' : 'gray'}
                    variant="outline"
                  >
                    {status}
                  </Badge>
                </div>
              </div>

              {result?.output_data && status === 'completed' && (
                <div className="mt-3 rounded-xl bg-surface-base p-3 text-xs text-greyscale-600 dark:text-greyscale-400 font-mono break-all">
                  {typeof result.output_data['output'] === 'string'
                    ? String(result.output_data['output']).slice(0, 200)
                    : JSON.stringify(result.output_data).slice(0, 200)}
                </div>
              )}

              {result?.error_message && status === 'failed' && (
                <p className="mt-2 text-xs text-status-red">{result.error_message}</p>
              )}
            </motion.div>
          )
        })}
    </div>
  )
}
