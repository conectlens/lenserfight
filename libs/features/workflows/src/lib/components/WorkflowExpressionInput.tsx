/**
 * WorkflowExpressionInput — expression-aware wrapper for text inputs.
 *
 * Extends a standard <input> or <textarea> with:
 *   1. Drop target: accepts [[nodeId.field]] expressions dragged from
 *      WorkflowOutputFieldRow.  Inserts at cursor (textarea) or replaces value
 *      (single-line input).
 *   2. Expression indicator: a small chip showing how many upstream refs are
 *      present when the value contains [[nodeId.field]] patterns.
 *   3. Compatibility indicator: orange warning when a dropped ref has a type
 *      mismatch; red when incompatible. Does not block saving.
 *
 * Static values (no [[...]]) pass through unchanged and existing validation
 * continues to work normally.
 *
 * The drag key "text/plain" is the same key used by WorkflowOutputFieldRow so
 * any drag source that sets a plain-text payload will be accepted. The canvas
 * XYFlow drag sources use "application/reactflow" which is distinct, so canvas
 * node dragging is unaffected.
 */
import React, { useRef, useState } from 'react'
import { Braces, AlertTriangle, AlertCircle } from 'lucide-react'

import type { RunnerConfigFieldType } from '../types/workflow-node.types'
import { hasWorkflowExpression, parseWorkflowExpression } from '../utils/workflow-expression'
import { validateParameterMapping } from '../utils/validate-parameter-mapping'
import type { MappingCompatibility } from '../utils/validate-parameter-mapping'

// Matches the dragstart payload from WorkflowOutputFieldRow:
// [[nodeId.field]] — we need to extract the output type to validate compatibility
// Since we don't get the type from the drag payload, we store it in a meta attribute
// on the draggable element. As a fallback, compatibility defaults to 'warning'.
const EXPR_DRAG_KEY = 'text/plain'
const EXPR_TYPE_DRAG_KEY = 'application/x-workflow-output-type'

export interface WorkflowExpressionInputProps {
  value: string
  onChange: (value: string) => void
  fieldType: RunnerConfigFieldType
  multiline?: boolean
  placeholder?: string
  rows?: number
  mono?: boolean
  error?: boolean
  disabled?: boolean
  id?: string
  className?: string
  onBlur?: () => void
}

export function WorkflowExpressionInput({
  value,
  onChange,
  fieldType,
  multiline,
  placeholder,
  rows = 4,
  mono,
  error,
  disabled,
  id,
  className = '',
  onBlur,
}: WorkflowExpressionInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [lastDropCompatibility, setLastDropCompatibility] = useState<MappingCompatibility | null>(null)

  const refs = parseWorkflowExpression(value)
  const hasRefs = refs.length > 0

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    // Only accept drops that carry our expression payload
    if (e.dataTransfer.types.includes(EXPR_DRAG_KEY)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()  // Don't let canvas XYFlow onDrop fire
    setIsDragOver(false)

    const expression = e.dataTransfer.getData(EXPR_DRAG_KEY)
    if (!expression || !expression.startsWith('[[')) return

    // Check type compatibility if the drag source provided it
    const outputType = e.dataTransfer.getData(EXPR_TYPE_DRAG_KEY)
    if (outputType) {
      const compat = validateParameterMapping(outputType, fieldType)
      setLastDropCompatibility(compat)
    } else {
      setLastDropCompatibility('warning')
    }

    if (multiline && textareaRef.current) {
      const el = textareaRef.current
      const start = el.selectionStart ?? value.length
      const end = el.selectionEnd ?? value.length
      const newValue = value.slice(0, start) + expression + value.slice(end)
      onChange(newValue)
      // Restore cursor after the inserted expression
      requestAnimationFrame(() => {
        el.selectionStart = start + expression.length
        el.selectionEnd = start + expression.length
        el.focus()
      })
    } else {
      // For single-line fields: replace the entire value
      onChange(expression)
    }
  }

  const dropBorderClass = isDragOver
    ? 'ring-2 ring-primary-yellow-400/60 border-primary-yellow-400'
    : ''

  const baseInputClasses = `
    w-full rounded-xl border bg-surface-raised px-3.5 py-2.5
    text-sm text-greyscale-900 placeholder:text-greyscale-400
    dark:text-greyscale-50 dark:placeholder:text-greyscale-600
    outline-none transition-all duration-normal ease-standard shadow-neu-1
    focus:shadow-neu-inset-1 text-xs
    ${mono ? 'font-mono' : ''}
    ${error
      ? 'border-status-red focus:ring-2 focus:ring-status-red/30'
      : 'border-surface-border focus:border-deep-lens-navy-400 focus:ring-2 focus:ring-deep-lens-navy-400/20 dark:focus:border-primary-yellow-500 dark:focus:ring-primary-yellow-500/20'
    }
    ${disabled ? 'cursor-not-allowed opacity-50 shadow-none' : ''}
    ${className}
  `

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop highlight overlay */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-2 ring-primary-yellow-400/60 bg-primary-yellow-400/5" />
      )}

      {multiline ? (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => { setLastDropCompatibility(null); onBlur?.() }}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`${baseInputClasses} resize-none ${dropBorderClass}`}
        />
      ) : (
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => { setLastDropCompatibility(null); onBlur?.() }}
          placeholder={placeholder}
          disabled={disabled}
          className={`${baseInputClasses} ${dropBorderClass}`}
        />
      )}

      {/* Expression ref indicator chip */}
      {hasRefs && (
        <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-deep-lens-navy-400/10 dark:bg-primary-yellow-500/10 px-1.5 py-0.5 pointer-events-none">
          <Braces size={9} className="text-deep-lens-navy-400 dark:text-primary-yellow-400" />
          <span className="text-[9px] font-medium text-deep-lens-navy-400 dark:text-primary-yellow-400">
            {refs.length}
          </span>
        </div>
      )}

      {/* Compatibility warning after drop */}
      {lastDropCompatibility === 'warning' && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400">
          <AlertTriangle size={10} />
          <span>Type mismatch — value will be converted. Verify the result.</span>
        </div>
      )}
      {lastDropCompatibility === 'incompatible' && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-status-red">
          <AlertCircle size={10} />
          <span>Incompatible types — this mapping may produce unexpected results.</span>
        </div>
      )}
    </div>
  )
}
