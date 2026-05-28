import { Badge } from '@lenserfight/ui/components'
import React from 'react'

import type { BadgeColor, BadgeVariant } from '@lenserfight/ui/components'

type BattleStatus = 'draft' | 'open' | 'executing' | 'voting' | 'scoring' | 'closed' | 'published' | 'archived'

const STATUS_CONFIG: Record<BattleStatus, { label: string; color: BadgeColor; variant: BadgeVariant }> = {
  draft: { label: 'Draft', color: 'gray', variant: 'solid' },
  open: { label: 'Open', color: 'green', variant: 'solid' },
  executing: { label: 'Running', color: 'blue', variant: 'solid' },
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
    <span className={`inline-flex ${isVoting ? 'animate-pulse' : ''}`}>
      <Badge color={color} variant={variant} size="sm" className="tracking-wide">
        {label}
      </Badge>
    </span>
  )
}
