import { motion } from 'framer-motion'
import { Trophy, Users, Zap } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import type { TournamentRecord } from '@lenserfight/data/repositories'

const STATUS_LABELS: Record<TournamentRecord['status'], string> = {
  pending:      'Pending',
  registration: 'Open Registration',
  active:       'In Progress',
  completed:    'Completed',
  cancelled:    'Cancelled',
}

const STATUS_COLORS: Record<TournamentRecord['status'], string> = {
  pending:      'text-greyscale-400 bg-greyscale-800',
  registration: 'text-green-400 bg-green-900/30',
  active:       'text-yellow-400 bg-yellow-900/30',
  completed:    'text-blue-400 bg-blue-900/30',
  cancelled:    'text-red-400 bg-red-900/30',
}

const FORMAT_LABELS: Record<TournamentRecord['format'], string> = {
  single_elimination: 'Single Elimination',
  round_robin:        'Round Robin',
  swiss:              'Swiss',
}

interface TournamentCardProps {
  tournament: TournamentRecord
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link
        to={`/tournaments/${tournament.slug}`}
        className="flex flex-col gap-3 rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 hover:border-greyscale-600 hover:bg-greyscale-800 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-greyscale-100 leading-snug">{tournament.title}</p>
          <span
            className={[
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              STATUS_COLORS[tournament.status],
            ].join(' ')}
          >
            {STATUS_LABELS[tournament.status]}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-greyscale-400">
          <span className="flex items-center gap-1">
            <Trophy size={12} />
            {FORMAT_LABELS[tournament.format]}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            Up to {tournament.max_contenders}
          </span>
          {tournament.ai_judge_enabled && (
            <span className="flex items-center gap-1 text-yellow-400">
              <Zap size={12} />
              AI Judge
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
