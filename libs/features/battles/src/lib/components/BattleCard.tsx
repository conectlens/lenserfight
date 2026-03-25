import { Badge, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import React from 'react'
import { Link } from 'react-router-dom'

import { BattleStatusBadge } from './BattleStatusBadge'

import type { BattleStatus } from '../types/battle.types'


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
      className="block"
      whileHover={{
        y: -3,
        boxShadow: '0 18px 48px rgba(0,0,0,0.10)',
      }}
      transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Badge color="gray" variant="outline">
              Battle
            </Badge>
            <h3 className="line-clamp-2 text-base font-bold leading-tight text-greyscale-900 dark:text-greyscale-50">
              {title}
            </h3>
          </div>
          <BattleStatusBadge status={status as BattleStatus} />
        </div>

        <p className="line-clamp-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{taskPrompt}</p>

        {contenders && contenders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {contenders.map((c) => (
              <Badge key={c.slot} color={c.slot === 'A' ? 'blue' : 'yellow'} variant="outline">
                {c.slot}: {c.displayName}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-greyscale-500 dark:text-greyscale-400">
          <span>Votes</span>
          <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">{totalVoteCount}</span>
        </div>
      </Card>
    </MotionLink>
  )
}
