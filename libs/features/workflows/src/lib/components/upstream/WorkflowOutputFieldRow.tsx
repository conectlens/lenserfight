/**
 * WorkflowOutputFieldRow — renders a single output field from an upstream node.
 *
 * Draggable via HTML5 Drag API. On dragstart it writes
 * `[[nodeId.fieldName]]` to dataTransfer so WorkflowExpressionInput can
 * intercept the drop and insert the expression at the cursor.
 *
 * Large values are truncated at 200 chars. Sensitive fields show a mask
 * instead of the value and are not copyable.
 */
import React, { useState } from 'react'
import { GripVertical } from 'lucide-react'

import type { WorkflowNodeIOType } from '@lenserfight/infra/execution'

const MAX_VALUE_CHARS = 200

interface WorkflowOutputFieldRowProps {
  nodeId: string
  fieldName: string
  fieldType: WorkflowNodeIOType | string
  fieldDescription?: string
  liveValue?: unknown
  sensitive?: boolean
}

export function WorkflowOutputFieldRow({
  nodeId,
  fieldName,
  fieldType,
  fieldDescription,
  liveValue,
  sensitive,
}: WorkflowOutputFieldRowProps) {
  const [isDragging, setIsDragging] = useState(false)
  const expression = `[[${nodeId}.${fieldName}]]`

  const hasValue = liveValue !== undefined && liveValue !== null
  const displayValue = hasValue ? formatValue(liveValue, sensitive) : null
  const isTruncated = hasValue && !sensitive && displayValue!.length > MAX_VALUE_CHARS

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', expression)
    e.dataTransfer.effectAllowed = 'copy'
    setIsDragging(true)
  }

  function handleDragEnd() {
    setIsDragging(false)
  }

  return (
    <div
      className={`group flex items-start gap-2 rounded-md px-2 py-1.5 cursor-grab transition-colors ${
        isDragging
          ? 'bg-primary-yellow-500/10 border border-primary-yellow-400/30'
          : 'hover:bg-surface-raised border border-transparent'
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={fieldDescription ?? `Drag to insert ${expression}`}
    >
      {/* Drag handle */}
      <GripVertical
        size={12}
        className="mt-0.5 flex-shrink-0 text-greyscale-300 group-hover:text-greyscale-500 transition-colors"
      />

      <div className="flex-1 min-w-0">
        {/* Field name + type badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-greyscale-800 dark:text-greyscale-100 font-mono truncate">
            {fieldName}
          </span>
          <TypeBadge type={fieldType} />
        </div>

        {/* Live value or schema description */}
        {hasValue ? (
          <div
            className={`mt-0.5 text-[10px] font-mono break-all ${
              sensitive ? 'text-greyscale-400 select-none' : 'text-greyscale-500 dark:text-greyscale-400'
            }`}
          >
            {isTruncated
              ? `${displayValue!.slice(0, MAX_VALUE_CHARS)}…`
              : displayValue}
          </div>
        ) : fieldDescription ? (
          <div className="mt-0.5 text-[10px] text-greyscale-400 dark:text-greyscale-500 italic truncate">
            {fieldDescription}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-block rounded px-1 py-0 text-[9px] font-medium uppercase tracking-wide border ${typeColors(type)}`}
    >
      {type}
    </span>
  )
}

function typeColors(type: string): string {
  switch (type) {
    case 'text':
      return 'border-sky-300/50 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
    case 'json':
    case 'object':
    case 'array':
      return 'border-violet-300/50 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
    case 'number':
    case 'boolean':
      return 'border-amber-300/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
    case 'image':
    case 'audio':
    case 'video':
    case 'file':
      return 'border-rose-300/50 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
    case 'embedding':
      return 'border-pink-300/50 text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20'
    case 'lens_result':
    case 'agent_result':
    case 'battle_result':
    case 'workflow_result':
      return 'border-emerald-300/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    default:
      return 'border-greyscale-300 text-greyscale-500 bg-greyscale-50 dark:bg-greyscale-800/30'
  }
}

function formatValue(value: unknown, sensitive?: boolean): string {
  if (sensitive) return '••••••'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
