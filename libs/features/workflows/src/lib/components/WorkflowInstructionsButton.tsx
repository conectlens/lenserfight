/**
 * Copies the AI-facing workflow authoring instructions.
 *
 * The text is generated from the node catalog and the workflow protocol rather
 * than hand-written, so it cannot drift from what the importer accepts. A
 * format toggle is not offered here — JSON is the default the importer
 * auto-detects, and the dialog exposes YAML for people who prefer it.
 */
import { copyTextToClipboard } from '@lenserfight/utils/text'
import { Check, Copy } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { buildWorkflowInstructionsText } from '../utils/workflow-instructions'

import type { WorkflowInstructionFormat } from '@lenserfight/infra/workflow-authoring'

const COPY_FEEDBACK_MS = 2000

export interface WorkflowInstructionsButtonProps {
  /** Serialisation the instructions ask the model to produce. */
  format?: WorkflowInstructionFormat
  /** Overrides the default button label. */
  label?: string
}

export function WorkflowInstructionsButton({
  format = 'json',
  label = 'Workflow Instructions',
}: WorkflowInstructionsButtonProps = {}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(buildWorkflowInstructionsText(format))
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy workflow design instructions for an AI assistant"
      className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-surface-border bg-surface-base px-2.5 py-1.5 text-xs font-medium text-greyscale-500 shadow-sm transition-colors hover:bg-surface-raised hover:text-greyscale-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 dark:hover:text-greyscale-100"
    >
      {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      <span aria-live="polite">{copied ? 'Instructions copied' : label}</span>
    </button>
  )
}
