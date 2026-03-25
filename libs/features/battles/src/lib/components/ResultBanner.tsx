import React from 'react'
import { motion } from 'framer-motion'
import { ScoreBar } from '@lenserfight/ui/widgets'

interface ResultBannerProps {
  winnerName?: string
  winnerSlot?: 'A' | 'B' | 'draw'
  voteA: number
  voteB: number
  drawCount?: number
}

// Particle colors from design tokens
const PARTICLE_COLORS = [
  'var(--cl-status-blue)',
  'var(--cl-status-purple)',
  'var(--cl-status-green)',
  'var(--cl-yellow-500)',
  'var(--cl-navy-400)',
]

export function ResultBanner({ winnerName, winnerSlot, voteA, voteB, drawCount = 0 }: ResultBannerProps) {
  const isWinner = winnerSlot === 'A' || winnerSlot === 'B'

  return (
    <div className="relative overflow-hidden">
      {isWinner &&
        PARTICLE_COLORS.map((color, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full w-2 h-2 pointer-events-none"
            style={{
              backgroundColor: color,
              left: `${15 + i * 17}%`,
              top: '50%',
            }}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -80 }}
            transition={{
              duration: 1.2,
              delay: i * 0.1,
              ease: [0.4, 0, 1, 1],
            }}
          />
        ))}

      <motion.div
        className="rounded-xl border-2 border-[var(--cl-surface-text)] bg-[var(--cl-surface-raised)] p-6 text-center space-y-3"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      >
        {winnerSlot === 'draw' ? (
          <p className="text-xl font-bold text-[var(--cl-surface-text-muted)]">🤝 It's a Draw</p>
        ) : winnerName ? (
          <p className="text-xl font-bold text-[var(--cl-surface-text)]">🏆 {winnerName} wins</p>
        ) : (
          <p className="text-lg font-medium text-[var(--cl-surface-text-disabled)]">Result pending</p>
        )}

        <ScoreBar scoreA={voteA} scoreB={voteB} labelA="A" labelB="B" />

        <div className="flex justify-between text-xs text-[var(--cl-surface-text-muted)] px-1">
          <span>{voteA} votes</span>
          {drawCount > 0 && <span>{drawCount} draws</span>}
          <span>{voteB} votes</span>
        </div>
      </motion.div>
    </div>
  )
}
