import { Button, Card } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
import React, { useState } from 'react'
import { Twitter } from 'lucide-react'

interface BattleShareCardProps {
  battleSlug: string
  battleTitle: string
  winnerName?: string | null
  ogImageUrl?: string | null
}

export function BattleShareCard({ battleSlug, battleTitle, winnerName, ogImageUrl }: BattleShareCardProps) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/battles/${battleSlug}/result`

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const tweetText = winnerName
    ? `${battleTitle} — Winner: ${winnerName} 🏆 via @lenserfight`
    : `${battleTitle} — Battle concluded on @lenserfight`

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Share this result</p>
      <p className="text-xs leading-6 text-greyscale-500 dark:text-greyscale-400">{battleTitle}</p>

      {ogImageUrl && (
        <img
          src={ogImageUrl}
          alt="Battle result card"
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: 200 }}
        />
      )}

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

      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-greyscale-900 transition-colors w-full"
      >
        <Twitter size={15} />
        Share on X
      </a>
    </Card>
  )
}
