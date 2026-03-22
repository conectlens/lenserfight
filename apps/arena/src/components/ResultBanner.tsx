import React from 'react'

interface ResultBannerProps {
  winnerName?: string
  winnerSlot?: 'A' | 'B' | 'draw'
  voteA: number
  voteB: number
  drawCount?: number
}

export function ResultBanner({ winnerName, winnerSlot, voteA, voteB, drawCount = 0 }: ResultBannerProps) {
  const total = voteA + voteB + drawCount || 1
  const pctA = Math.round((voteA / total) * 100)
  const pctB = Math.round((voteB / total) * 100)

  return (
    <div className="rounded-xl border-2 border-gray-900 bg-gray-50 p-6 text-center space-y-3">
      {winnerSlot === 'draw' ? (
        <p className="text-xl font-bold text-gray-700">🤝 It's a Draw</p>
      ) : winnerName ? (
        <p className="text-xl font-bold text-gray-900">🏆 {winnerName} wins</p>
      ) : (
        <p className="text-lg font-medium text-gray-500">Result pending</p>
      )}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>
          {voteA} votes ({pctA}%)
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pctA}%` }} />
        </div>
        <div
          className="h-2 bg-orange-400 rounded-full"
          style={{ width: `${pctB}%`, minWidth: pctB > 0 ? 4 : 0 }}
        />
        <span>
          {voteB} votes ({pctB}%)
        </span>
      </div>
      {drawCount > 0 && <p className="text-xs text-gray-400">{drawCount} draws</p>}
    </div>
  )
}
