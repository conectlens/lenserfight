import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@lenserfight/ui/components'

interface VotePanelProps {
  battleId: string
  contenderA: { id: string; displayName: string }
  contenderB: { id: string; displayName: string }
  existingVote?: 'contender_a' | 'contender_b' | 'draw' | null
  onVote: (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => Promise<void>
  disabled?: boolean
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
}

const buttonVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  },
}

export function VotePanel({ contenderA, contenderB, existingVote, onVote, disabled }: VotePanelProps) {
  const [selected, setSelected] = useState<'contender_a' | 'contender_b' | 'draw' | null>(existingVote ?? null)
  const [rationale, setRationale] = useState('')
  const [loading, setLoading] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  const handleSelect = (val: 'contender_a' | 'contender_b' | 'draw') => {
    if (existingVote) {
      setShakeKey((k) => k + 1)
      return
    }
    setSelected(val)
  }

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
      <motion.div
        key={`voted-${shakeKey}`}
        animate={shakeKey > 0 ? { x: [-4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-[var(--cl-surface-border)] bg-[var(--cl-surface-raised)] p-4 text-center text-sm text-[var(--cl-surface-text-muted)]"
      >
        You voted for{' '}
        <strong className="text-[var(--cl-surface-text)]">
          {existingVote === 'draw'
            ? 'Draw'
            : existingVote === 'contender_a'
            ? contenderA.displayName
            : contenderB.displayName}
        </strong>
        .
      </motion.div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--cl-surface-border)] bg-[var(--cl-surface-base)] p-4 space-y-3">
      <p className="text-sm font-medium text-[var(--cl-surface-text-muted)]">Cast your vote</p>
      <motion.div
        className="grid grid-cols-3 gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {(
          [
            ['contender_a', contenderA.displayName],
            ['draw', 'Draw'],
            ['contender_b', contenderB.displayName],
          ] as const
        ).map(([val, label]) => (
          <motion.button
            key={val}
            variants={buttonVariants}
            onClick={() => handleSelect(val)}
            disabled={disabled}
            animate={selected === val ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={selected === val ? { duration: 0.25 } : {}}
            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              selected === val
                ? 'border-[var(--cl-surface-text)] bg-[var(--cl-surface-text)] text-[var(--cl-surface-base)]'
                : 'border-[var(--cl-surface-border)] bg-transparent text-[var(--cl-surface-text)] hover:border-[var(--cl-surface-border-subtle)]'
            }`}
          >
            {label}
          </motion.button>
        ))}
      </motion.div>
      <textarea
        placeholder="Why? (optional)"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={2}
        className="w-full text-sm border border-[var(--cl-surface-border)] rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--cl-surface-border-subtle)] bg-[var(--cl-surface-raised)] text-[var(--cl-surface-text)]"
      />
      <Button
        variant="dark"
        size="sm"
        onClick={handleVote}
        disabled={!selected || disabled}
        isLoading={loading}
      >
        Submit Vote
      </Button>
    </div>
  )
}
