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
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Share this Result</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 font-mono"
        />
        <button
          onClick={copy}
          className="text-xs px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors whitespace-nowrap"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        This result page is permanent and publicly accessible.
      </p>
    </div>
  )
}
