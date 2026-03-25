import { Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import React, { useState } from 'react'

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
        className="rounded-2xl border border-surface-border bg-surface-raised p-4 text-center text-sm text-greyscale-600 dark:text-greyscale-400"
      >
        <Badge color="green" variant="outline" className="mb-3">
          Vote recorded
        </Badge>
        You voted for{' '}
        <strong className="text-greyscale-900 dark:text-greyscale-50">
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
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Cast your vote</p>
        <Badge color="blue" variant="outline">
          Primary signal
        </Badge>
      </div>
      <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
        Pick the contender that answered the Lens better. Your rationale is optional and stays secondary.
      </p>
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
              className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
                selected === val
                  ? 'border-greyscale-900 bg-greyscale-900 text-greyscale-0 dark:border-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                  : 'border-surface-border bg-surface-base text-greyscale-700 hover:border-status-blue dark:text-greyscale-300'
              }`}
              aria-pressed={selected === val}
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
        className="w-full resize-none rounded-2xl border border-surface-border bg-surface-raised p-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue dark:text-greyscale-50"
      />
      <Button
        variant="dark"
        size="sm"
        onClick={handleVote}
        disabled={!selected || disabled}
        isLoading={loading}
        className="w-auto"
      >
        Submit Vote
      </Button>
    </Card>
  )
}
