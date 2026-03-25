import React, { useState } from 'react'
import { Button } from '@lenserfight/ui/components'

interface BattleShareCardProps {
  battleSlug: string
  battleTitle: string
}

export function BattleShareCard({ battleSlug, battleTitle }: BattleShareCardProps) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/battles/${battleSlug}/result`

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-[var(--cl-surface-border)] bg-[var(--cl-surface-base)] p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--cl-surface-text)]">Share this Result</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 text-xs border border-[var(--cl-surface-border)] rounded-lg px-3 py-2 bg-[var(--cl-surface-raised)] text-[var(--cl-surface-text-muted)] font-mono"
        />
        <Button variant="dark" size="sm" onClick={copy} className="whitespace-nowrap w-auto">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <p className="text-xs text-[var(--cl-surface-text-disabled)]">
        This result page is permanent and publicly accessible.
      </p>
    </div>
  )
}
