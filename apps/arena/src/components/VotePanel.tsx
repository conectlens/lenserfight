import React, { useState } from 'react'

interface VotePanelProps {
  battleId: string
  contenderA: { id: string; displayName: string }
  contenderB: { id: string; displayName: string }
  existingVote?: 'contender_a' | 'contender_b' | 'draw' | null
  onVote: (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => Promise<void>
  disabled?: boolean
}

export function VotePanel({ contenderA, contenderB, existingVote, onVote, disabled }: VotePanelProps) {
  const [selected, setSelected] = useState<'contender_a' | 'contender_b' | 'draw' | null>(existingVote ?? null)
  const [rationale, setRationale] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVote = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await onVote(selected, rationale)
    } finally {
      setLoading(false)
    }
  }

  if (existingVote) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
        You voted for{' '}
        <strong>
          {existingVote === 'draw'
            ? 'Draw'
            : existingVote === 'contender_a'
            ? contenderA.displayName
            : contenderB.displayName}
        </strong>
        .
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Cast your vote</p>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['contender_a', contenderA.displayName],
            ['draw', 'Draw'],
            ['contender_b', contenderB.displayName],
          ] as const
        ).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setSelected(val)}
            disabled={disabled}
            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
              selected === val
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Why? (optional)"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      <button
        onClick={handleVote}
        disabled={!selected || loading || disabled}
        className="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-gray-700 transition-colors"
      >
        {loading ? 'Submitting…' : 'Submit Vote'}
      </button>
    </div>
  )
}
