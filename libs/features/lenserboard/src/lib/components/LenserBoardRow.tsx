import { Trophy, Flame, MoreHorizontal, User, ExternalLink } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '@lenserfight/ui/components'
import { LeaderboardEntry, LeaderboardLenser } from '@lenserfight/types'
import { EloLeaderboardEntry } from '@lenserfight/data/repositories'
import { formatCount } from '@lenserfight/utils/number'

type LenserBoardRowProps =
  | { mode: 'xp'; entry: LeaderboardEntry; isCurrentUser?: boolean }
  | { mode: 'activity'; entry: LeaderboardLenser }
  | { mode: 'elo'; entry: EloLeaderboardEntry }

interface RowData {
  rank: number
  handle: string
  displayName: string
  avatarUrl: string | null | undefined
  statPrimary: string
  statSecondary: string
  badge?: React.ReactNode
  extras?: React.ReactNode
  isCurrentUser?: boolean
}

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1)
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-yellow-950 shadow-md ring-2 ring-yellow-100 dark:ring-yellow-900/20 font-black text-base flex-shrink-0">
        1
      </div>
    )
  if (rank === 2)
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-800 shadow ring-2 ring-slate-100 dark:ring-slate-800 font-bold text-base flex-shrink-0">
        2
      </div>
    )
  if (rank === 3)
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-orange-900 shadow ring-2 ring-orange-100 dark:ring-orange-900/20 font-bold text-base flex-shrink-0">
        3
      </div>
    )
  return (
    <span className="w-9 text-center text-sm font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">
      #{rank}
    </span>
  )
}

const RowDropdown: React.FC<{ handle: string; onNavigate: () => void }> = ({ handle, onNavigate }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="More options"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onNavigate()
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <User size={14} />
            View Profile
          </button>
          <a
            href={`/lenser/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ExternalLink size={14} />
            Open in new tab
          </a>
        </div>
      )}
    </div>
  )
}

const UnifiedRow: React.FC<RowData & { onNavigate: () => void }> = ({
  rank,
  handle,
  displayName,
  avatarUrl,
  statPrimary,
  statSecondary,
  badge,
  extras,
  isCurrentUser,
  onNavigate,
}) => {
  const rankBorderCls =
    rank === 1
      ? 'border-yellow-200 dark:border-yellow-700/50'
      : rank === 2
        ? 'border-slate-200 dark:border-slate-700/50'
        : rank === 3
          ? 'border-orange-200 dark:border-orange-800/50'
          : isCurrentUser
            ? 'border-primary/30'
            : 'border-gray-100 dark:border-gray-700'

  const containerCls = [
    'group flex items-center gap-3 p-3 sm:p-4 rounded-xl border cursor-pointer',
    'transition-all duration-150',
    'hover:scale-[1.01] hover:shadow-md',
    rankBorderCls,
    isCurrentUser
      ? 'bg-primary/5 dark:bg-primary/5'
      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700',
  ].join(' ')

  return (
    <div onClick={onNavigate} className={containerCls}>
      {/* Rank */}
      <div className="flex items-center justify-center w-9 flex-shrink-0">
        <RankBadge rank={rank} />
      </div>

      {/* Avatar */}
      <Avatar
        src={avatarUrl}
        alt={displayName}
        size="md"
        className={[
          '!w-9 !h-9 flex-shrink-0',
          rank === 1 ? 'ring-2 ring-yellow-400 dark:ring-yellow-600' : '',
        ].join(' ')}
      />

      {/* Name + handle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p
            className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-primary-900 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}
          >
            {displayName}
          </p>
          {rank === 1 && <Trophy size={13} className="text-yellow-500 fill-current flex-shrink-0" />}
          {badge}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{handle}</p>
      </div>

      {/* Extras (streak, level, etc.) — hidden on mobile */}
      {extras && <div className="hidden sm:flex items-center gap-3">{extras}</div>}

      {/* Stats */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white">{statPrimary}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{statSecondary}</p>
      </div>

      {/* Dropdown */}
      <RowDropdown handle={handle} onNavigate={onNavigate} />
    </div>
  )
}

export const LenserBoardRow: React.FC<LenserBoardRowProps> = (props) => {
  const navigate = useNavigate()

  if (props.mode === 'activity') {
    const { entry } = props
    return (
      <UnifiedRow
        rank={entry.rank}
        handle={entry.handle}
        displayName={entry.displayName}
        avatarUrl={entry.avatarUrl}
        statPrimary={`${entry.totalXp.toLocaleString()} XP`}
        statSecondary={`Score ${entry.lenserScore.toFixed(1)}`}
        onNavigate={() => navigate(`/lenser/${entry.handle}`)}
      />
    )
  }

  if (props.mode === 'elo') {
    const { entry } = props
    return (
      <UnifiedRow
        rank={entry.elo_rank}
        handle={entry.handle}
        displayName={entry.display_name}
        avatarUrl={entry.avatar_url}
        statPrimary={Math.round(entry.elo_score).toLocaleString()}
        statSecondary={`${entry.battles_won}W / ${entry.battles_played - entry.battles_won}L`}
        onNavigate={() => navigate(`/lenser/${entry.handle}`)}
      />
    )
  }

  // mode === 'xp'
  const { entry, isCurrentUser } = props
  const { rank, displayName, handle, avatarUrl, totalXp, level, streak } = entry
  const isGold = rank === 1

  const extras = (
    <>
      {streak !== undefined && streak > 0 && (
        <div className="flex items-center gap-1 text-orange-500 font-semibold text-sm" title="Current Streak">
          <Flame size={14} className="fill-current" />
          <span>{streak}</span>
        </div>
      )}
      <div
        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isGold ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
      >
        Lvl {level}
      </div>
    </>
  )

  return (
    <UnifiedRow
      rank={rank}
      handle={handle ?? ''}
      displayName={displayName}
      avatarUrl={avatarUrl}
      statPrimary={`${formatCount(totalXp)} XP`}
      statSecondary={`Level ${level}`}
      extras={extras}
      isCurrentUser={isCurrentUser}
      onNavigate={() => navigate(`/lenser/${handle}`)}
    />
  )
}
