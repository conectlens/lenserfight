import { Badge, Button, Card } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import { motion } from 'framer-motion'
import React, { useState } from 'react'

import type { VoterEligibility } from '../types/battle.types'

interface VotePanelProps {
  battleId: string
  contenderA: { id: string; displayName: string }
  contenderB: { id: string; displayName: string }
  existingVote?: 'contender_a' | 'contender_b' | 'draw' | null
  onVote: (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => Promise<void>
  disabled?: boolean
  voterEligibility?: VoterEligibility
  isEligible?: boolean
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

const ELIGIBILITY_MESSAGES: Record<string, string> = {
  human_only: 'This battle is restricted to human lensers.',
  ai_only: 'This battle uses AI judges only.',
  verified_lenser: 'Only verified lensers can vote. Complete your onboarding to participate.',
}

const ELIGIBILITY_LABELS: Partial<Record<VoterEligibility, { label: string; color: 'blue' | 'yellow' | 'gray' }>> = {
  open: { label: 'Open vote', color: 'blue' },
  lenser_only: { label: 'Lensers only', color: 'yellow' },
  verified_lenser: { label: 'Verified lensers only', color: 'yellow' },
  ai_only: { label: 'AI judges only', color: 'gray' },
}

export function VotePanel({ contenderA, contenderB, existingVote, onVote, disabled, voterEligibility, isEligible = true }: VotePanelProps) {
  const [selected, setSelected] = useState<'contender_a' | 'contender_b' | 'draw' | null>(existingVote ?? null)
  const [rationale, setRationale] = useState('')
  const [loading, setLoading] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  // Show ineligibility gate before anything else
  if (!isEligible && voterEligibility && voterEligibility !== 'open') {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-5 text-center space-y-2">
        <Badge color="yellow" variant="outline" className="mb-2">Restricted voting</Badge>
        <p className="text-sm text-surface-text-muted">
          {ELIGIBILITY_MESSAGES[voterEligibility] ?? 'You are not eligible to vote in this battle.'}
        </p>
      </div>
    )
  }

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
        className="rounded-2xl border border-surface-border bg-surface-raised p-4 text-center text-sm text-surface-text-muted"
      >
        <Badge color="green" variant="outline" className="mb-3">
          Vote recorded
        </Badge>
        You voted for{' '}
        <strong className="text-surface-text">
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

  const eligibilityInfo = voterEligibility ? ELIGIBILITY_LABELS[voterEligibility] : undefined

  return (
    <Card className="space-y-4 p-4">
      {eligibilityInfo && (
        <Badge color={eligibilityInfo.color} variant="outline" className="mb-2">
          {eligibilityInfo.label}
        </Badge>
      )}
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-base font-bold text-surface-text tracking-tight">Cast your vote</h3>
        <Badge color="blue" variant="outline" className="uppercase tracking-wider text-[10px] font-bold">
          Signal
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-surface-text-muted px-1">
        Pick the contender that answered the Lens better. Your rationale is optional and stays secondary.
      </p>
      {/* Contender buttons — side by side */}
      <motion.div
        className="grid grid-cols-2 gap-2 pt-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {(
          [
            ['contender_a', contenderA.displayName],
            ['contender_b', contenderB.displayName],
          ] as const
        ).map(([val, label]) => (
          <motion.button
            key={val}
            variants={buttonVariants}
            onClick={() => handleSelect(val)}
            disabled={disabled}
            animate={selected === val ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={selected === val ? { duration: 0.25 } : {}}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 px-3 py-4 text-sm font-bold transition-all duration-200 shadow-sm gap-1 ${selected === val
              ? 'border-primary-yellow-500 bg-primary-yellow-50 dark:bg-primary-yellow-500/10 text-primary-yellow-900 dark:text-primary-yellow-400 scale-[1.02]'
              : 'border-surface-border bg-surface-base text-surface-text hover:border-surface-border-subtle hover:bg-surface-interactive'
              }`}
            aria-pressed={selected === val}
          >
            {selected === val && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
            )}
            <span className="truncate max-w-full text-center leading-tight">{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Tie option — visually secondary, not a contender */}
      <motion.button
        variants={buttonVariants}
        onClick={() => handleSelect('draw')}
        disabled={disabled}
        whileTap={{ scale: 0.97 }}
        className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-200 ${selected === 'draw'
          ? 'border-surface-border-subtle bg-surface-raised text-surface-text'
          : 'border-surface-border/60 bg-transparent text-surface-text-muted hover:bg-surface-raised hover:text-surface-text'
          }`}
        aria-pressed={selected === 'draw'}
      >
        {selected === 'draw' && <span className="w-1.5 h-1.5 rounded-full bg-surface-text" />}
        It&apos;s a tie
      </motion.button>
      <TextArea
        placeholder="Why did you choose this? (optional)"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        minRows={2}
        maxRows={4}
        autoResize={false}
        className="mt-2 text-sm bg-surface-base focus:ring-primary-yellow-500"
      />
      <Button
        variant="primary"
        onClick={handleVote}
        disabled={!selected || disabled}
        isLoading={loading}
        className="w-full mt-2 shadow-sm"
      >
        Submit Vote
      </Button>
    </Card>
  )
}
