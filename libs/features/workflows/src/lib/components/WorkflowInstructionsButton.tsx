import { copyTextToClipboard } from '@lenserfight/utils/text'
import { Check, Copy } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

export const WORKFLOW_CREATION_INSTRUCTIONS = `# How to Design a LenserFight Workflow

Design a practical workflow that a user can build in the LenserFight workflow canvas.

## Building blocks

- Trigger: Start with exactly one trigger. Choose Manual, Schedule, Webhook, Event, or Form Input.
- Lens: Use a Lens for AI reasoning, research, generation, analysis, or transformation that requires prompt instructions.
- Tool: Use a tool node for deterministic work such as conditions, code, data mapping, storage, HTTP calls, notifications, or media processing.
- Connection: Connect a named output from an earlier step to the exact input parameter of a later step.

Only suggest nodes available in the user's current workflow palette. Do not invent Lens IDs, node IDs, credentials, secrets, providers, or unsupported tools. Refer to Lenses and tools by readable name. If availability is uncertain, mark the node as "verify in palette".

## Design rules

1. State the workflow outcome in one sentence.
2. Use the fewest steps that reliably produce the outcome.
3. Put steps in dependency order.
4. Give every step one clear responsibility.
5. List every user-filled Lens parameter with an example value.
6. Identify values supplied by upstream outputs instead of asking the user twice.
7. Use tools for deterministic operations and Lenses for AI tasks.
8. End with the final output and how the user receives it.
9. Include validation, failure handling, and any required human approval.

## Required response format

\`\`\`json
{
  "title": "Short workflow title",
  "outcome": "One sentence describing the final result",
  "steps": [
    {
      "step": 1,
      "kind": "trigger | lens | tool",
      "name": "Readable palette or Lens name",
      "purpose": "One responsibility",
      "parameters": {
        "Parameter Label": "Example user value or {{steps.previous.output}}"
      },
      "outputs": ["output"]
    }
  ],
  "connections": [
    {
      "from": "step-1.output",
      "to": "step-2.Input Parameter"
    }
  ],
  "userInputs": ["Values the user must provide"],
  "validation": ["Checks required before running"],
  "finalOutput": "What the workflow returns"
}
\`\`\`

Return the JSON plan first. Then add no more than five concise implementation notes.`

const COPY_FEEDBACK_MS = 2000

export function WorkflowInstructionsButton() {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(WORKFLOW_CREATION_INSTRUCTIONS)
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
      <span aria-live="polite">{copied ? 'Instructions copied' : 'Workflow Instructions'}</span>
    </button>
  )
}
