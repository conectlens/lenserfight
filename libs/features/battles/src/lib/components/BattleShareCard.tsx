import { Button } from '@lenserfight/ui/components'
import { Card } from '@lenserfight/ui/components'
import React, { useState } from 'react'

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
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Share this result</p>
      <p className="text-xs leading-6 text-greyscale-500 dark:text-greyscale-400">{battleTitle}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded-2xl border border-surface-border bg-surface-raised px-3 py-2 font-mono text-xs text-greyscale-600 outline-none dark:text-greyscale-400"
        />
        <Button size="sm" onClick={copy} className="whitespace-nowrap w-auto">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </Card>
  )
}
