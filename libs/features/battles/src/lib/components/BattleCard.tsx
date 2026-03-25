import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BattleStatusBadge } from './BattleStatusBadge'

interface BattleCardProps {
  id: string
  slug: string
  title: string
  taskPrompt: string
  status: string
  totalVoteCount: number
  publishedAt?: string | null
  contenders?: { displayName: string; slot: string }[]
}

const MotionLink = motion(Link)

export function BattleCard({ slug, title, taskPrompt, status, totalVoteCount, contenders }: BattleCardProps) {
  return (
    <MotionLink
      to={`/battles/${slug}`}
      className="block bg-[var(--cl-surface-base)] border border-[var(--cl-surface-border)] rounded-xl p-4"
      whileHover={{
        y: -2,
        boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        borderColor: 'var(--cl-surface-border-subtle)',
      }}
      transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-[var(--cl-surface-text)] text-sm leading-tight line-clamp-2">{title}</h3>
        <BattleStatusBadge status={status as any} />
      </div>
      <p className="text-[var(--cl-surface-text-muted)] text-xs line-clamp-2 mb-3">{taskPrompt}</p>
      {contenders && contenders.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {contenders.map((c) => (
            <span
              key={c.slot}
              className="text-xs bg-[var(--cl-surface-raised)] rounded px-2 py-0.5 text-[var(--cl-surface-text-muted)]"
            >
              {c.slot}: {c.displayName}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 text-xs text-[var(--cl-surface-text-disabled)]">
        <span>🗳</span>
        <span>{totalVoteCount} votes</span>
      </div>
    </MotionLink>
  )
}
