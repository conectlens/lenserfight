import { Button, Card } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
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
        <Input
          readOnly
          value={url}
          className="min-w-0 flex-1 font-mono text-xs text-greyscale-600 dark:text-greyscale-400"
        />
        <Button size="sm" onClick={copy} className="whitespace-nowrap w-auto">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </Card>
  )
}
