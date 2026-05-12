// Phase BN — generative prompt step.
//
// User types a seed phrase; an AI expander turns it into a full battle
// prompt. The expander is injected so this component stays UI-only.

import { Button } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import React, { useState } from 'react'

export interface GenerativePromptStepProps {
  /**
   * Called when the user clicks Expand. Should call out to a model-running
   * RPC (eg. `lf run exec --model gpt-4o-mini`) and resolve to the rendered
   * prompt. Injected so the component is testable.
   */
  expandSeed: (seed: string) => Promise<string>
  /** Final accept handler — wizard advances when this fires. */
  onAccept: (prompt: string) => void
  className?: string
}

export function GenerativePromptStep({ expandSeed, onAccept, className }: GenerativePromptStepProps) {
  const [seed, setSeed] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExpand = async () => {
    if (!seed.trim()) return
    setBusy(true)
    setError(null)
    try {
      const out = await expandSeed(seed.trim())
      setExpanded(out)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      <TextArea
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
        placeholder="Seed phrase — e.g. 'compare two haiku styles'"
        minRows={2}
        maxRows={4}
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={handleExpand} disabled={busy || !seed.trim()} isLoading={busy}>
          Expand with AI
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">{error}</p>
      )}
      {expanded && (
        <div className="space-y-2">
          <pre className="whitespace-pre-wrap rounded-lg border border-surface-border bg-surface-raised p-3 text-sm">
            {expanded}
          </pre>
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={() => onAccept(expanded)}>
              Use this prompt
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
