import { Button } from '@lenserfight/ui/components'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import { X } from 'lucide-react'
import React from 'react'

import type { EdgeProps } from '@xyflow/react'

export interface WorkflowEdgeData {
  sourceOutputKey?: string
  onRemove?: (id: string) => void
  [key: string]: unknown
}

export function WorkflowCanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as WorkflowEdgeData | undefined
  const { sourceOutputKey = 'output', onRemove } = edgeData ?? {}

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: selected
            ? 'var(--cl-yellow-700)'
            : 'var(--cl-grey-500)',
          strokeWidth: selected ? 2.5 : 1.5,
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
      />

      {/* Edge label + delete button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1"
        >
          {/* Source key badge */}
          {sourceOutputKey && sourceOutputKey !== 'output' && (
            <span className="rounded-full bg-surface-base border border-surface-border px-1.5 py-0.5 text-[9px] font-mono text-greyscale-700 dark:text-greyscale-300 shadow-sm transition-colors">
              {sourceOutputKey}
            </span>
          )}

          {/* Delete button */}
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(id)}
              className="!h-4 !w-4 !p-0 !rounded-full !bg-surface-base border border-surface-border !text-greyscale-500 hover:!text-status-red hover:!border-status-red/50 shadow-sm transition-colors"
              title="Remove connection"
            >
              <X size={8} strokeWidth={3} />
            </Button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
