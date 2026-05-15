import type { AgentTeamEdgeType } from '@lenserfight/types'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { Settings2 } from 'lucide-react'
import React from 'react'
import { Button } from '@lenserfight/ui/components'


export interface AgentEdgeData extends Record<string, unknown> {
  edge_type?: AgentTeamEdgeType
  is_blocking?: boolean
  onConfigure?: (edgeId: string) => void
}

const EDGE_COLOR: Record<AgentTeamEdgeType, string> = {
  handoff:       'var(--color-primary-yellow-400, #fbbf24)',
  delegates:     'var(--color-sky-400, #38bdf8)',
  reviews:       'var(--color-purple-400, #c084fc)',
  reports_to:    'var(--color-gray-400, #9ca3af)',
  shares_context:'var(--color-emerald-400, #34d399)',
}

const EDGE_COLOR_SELECTED: Record<AgentTeamEdgeType, string> = {
  handoff:       'var(--color-primary-yellow-500, #f59e0b)',
  delegates:     'var(--color-sky-500, #0ea5e9)',
  reviews:       'var(--color-purple-500, #a855f7)',
  reports_to:    'var(--color-gray-500, #6b7280)',
  shares_context:'var(--color-emerald-500, #10b981)',
}

export const AgentEdgeLine: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) => {
  const d = (data ?? {}) as AgentEdgeData
  const edgeType = d.edge_type ?? 'handoff'
  const isBlocking = d.is_blocking ?? false

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const color = selected ? EDGE_COLOR_SELECTED[edgeType] : EDGE_COLOR[edgeType]
  const strokeWidth = selected ? 2.5 : 1.8
  const strokeDasharray = isBlocking ? '6 3' : undefined

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1"
        >
          <span
            className="rounded-full border border-white/20 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 shadow-sm backdrop-blur-sm dark:bg-gray-900/90 dark:text-gray-300"
            style={{ borderColor: color + '40' }}
          >
            {edgeType.replace(/_/g, ' ')}
          </span>
          {d.onConfigure && selected && (
            <Button
              type="button"
              title="Configure edge"
              onClick={() => d.onConfigure!(id)}
              className="flex size-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-primary-yellow-300 hover:text-primary-yellow-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-yellow-500 dark:hover:text-primary-yellow-400"
            >
              <Settings2 size={10} />
            </Button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
