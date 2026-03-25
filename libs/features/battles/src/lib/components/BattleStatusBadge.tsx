import React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@lenserfight/ui/components'
import type { BadgeColor, BadgeVariant } from '@lenserfight/ui/components'

type BattleStatus = 'draft' | 'open' | 'voting' | 'scoring' | 'closed' | 'published' | 'archived'

const STATUS_CONFIG: Record<BattleStatus, { label: string; color: BadgeColor; variant: BadgeVariant }> = {
  draft: { label: 'Draft', color: 'gray', variant: 'solid' },
  open: { label: 'Open', color: 'green', variant: 'solid' },
  voting: { label: 'Voting', color: 'blue', variant: 'solid' },
  scoring: { label: 'Scoring', color: 'yellow', variant: 'solid' },
  closed: { label: 'Closed', color: 'gray', variant: 'outline' },
  published: { label: 'Published', color: 'purple', variant: 'solid' },
  archived: { label: 'Archived', color: 'gray', variant: 'outline' },
}

export function BattleStatusBadge({ status }: { status: BattleStatus }) {
  const { label, color, variant } = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  const isVoting = status === 'voting'

  return (
    <motion.span
      className="inline-flex"
      animate={isVoting ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isVoting ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <Badge color={color} variant={variant} size="sm">
        {label}
      </Badge>
    </motion.span>
  )
}
