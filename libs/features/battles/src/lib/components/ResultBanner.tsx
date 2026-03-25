import { Badge } from '@lenserfight/ui/components'
import { ScoreBar } from '@lenserfight/ui/widgets'
import { motion } from 'framer-motion'
import React from 'react'

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
        className="rounded-3xl border border-greyscale-200 bg-surface-raised p-6 text-center shadow-neu-1 dark:border-greyscale-800"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      >
        <div className="space-y-3">
          {winnerSlot === 'draw' ? (
            <Badge color="gray" variant="outline">
              It’s a draw
            </Badge>
          ) : winnerName ? (
            <Badge color="green" variant="outline">
              Winner
            </Badge>
          ) : (
            <Badge color="gray" variant="outline">
              Result pending
            </Badge>
          )}

          {winnerSlot === 'draw' ? (
            <p className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
              The community split evenly.
            </p>
          ) : winnerName ? (
            <p className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
              {winnerName} wins the battle.
            </p>
          ) : (
            <p className="text-xl font-semibold text-greyscale-500 dark:text-greyscale-400">Result pending</p>
          )}
        </div>

        <div className="mt-5">
          <ScoreBar scoreA={voteA} scoreB={voteB} labelA="A" labelB="B" />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-greyscale-500 dark:text-greyscale-400">
          <span>{voteA} votes</span>
          {drawCount > 0 && <span>{drawCount} draws</span>}
          <span>{voteB} votes</span>
        </div>
      </motion.div>
    </div>
  )
}
