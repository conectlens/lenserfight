import { Trophy, Flame, MoreHorizontal } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '@lenserfight/ui/components'
import { LeaderboardEntry, LeaderboardLenser } from '@lenserfight/types'
import { EloLeaderboardEntry } from '@lenserfight/data/repositories'
import { formatCount } from '@lenserfight/utils/number'

type LenserBoardRowProps =
  | { mode: 'xp'; entry: LeaderboardEntry; isCurrentUser?: boolean }
  | { mode: 'activity'; entry: LeaderboardLenser }
  | { mode: 'elo'; entry: EloLeaderboardEntry }

const COMPACT_ROW =
  'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors bg-white hover:bg-gray-50 border-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 dark:border-gray-700'

export const LenserBoardRow: React.FC<LenserBoardRowProps> = (props) => {
  const navigate = useNavigate()

  if (props.mode === 'activity') {
    const { entry } = props
    return (
      <div onClick={() => navigate(`/lenser/${entry.handle}`)} className={COMPACT_ROW}>
        <span className="w-7 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
          {entry.rank}
        </span>
        <Avatar src={entry.avatarUrl} alt={entry.displayName} size="md" className="!w-9 !h-9 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{entry.displayName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">@{entry.handle}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{entry.totalXp.toLocaleString()} XP</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Score {entry.lenserScore.toFixed(1)}</p>
        </div>
      </div>
    )
  }

  if (props.mode === 'elo') {
    const { entry } = props
    return (
      <div onClick={() => navigate(`/lenser/${entry.handle}`)} className={COMPACT_ROW}>
        <span className="w-7 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
          {entry.elo_rank}
        </span>
        <Avatar src={entry.avatar_url} alt={entry.display_name} size="md" className="!w-9 !h-9 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{entry.display_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">@{entry.handle}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {Math.round(entry.elo_score).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {entry.battles_won}W / {entry.battles_played - entry.battles_won}L
          </p>
        </div>
      </div>
    )
  }

  // mode === 'xp'
  const { entry, isCurrentUser } = props
  const { rank, displayName, handle, avatarUrl, totalXp, level, streak } = entry

  const isGold = rank === 1
  const isSilver = rank === 2
  const isBronze = rank === 3

  const getRankBadge = () => {
    if (isGold)
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-yellow-950 shadow-lg ring-4 ring-yellow-100 dark:ring-yellow-900/20 font-black text-xl">
          1
        </div>
      )
    if (isSilver)
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-800 shadow-md ring-4 ring-slate-100 dark:ring-slate-800 font-bold text-lg">
          2
        </div>
      )
    if (isBronze)
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-orange-900 shadow-md ring-4 ring-orange-100 dark:ring-orange-900/20 font-bold text-lg">
          3
        </div>
      )
    return (
      <span className="text-xl font-bold text-gray-400 dark:text-gray-500 w-10 text-center">
        #{rank}
      </span>
    )
  }

  const getContainerStyles = () => {
    let base =
      'flex items-center gap-4 md:gap-6 p-4 rounded-2xl transition-all cursor-pointer group border'

    if (isGold) {
      base +=
        ' bg-gradient-to-r from-yellow-50/80 via-white to-white dark:from-yellow-900/10 dark:via-gray-800 dark:to-gray-800 border-yellow-200 dark:border-yellow-700/50 shadow-sm'
    } else if (isSilver) {
      base +=
        ' bg-gradient-to-r from-slate-50/80 via-white to-white dark:from-slate-800/30 dark:via-gray-800 dark:to-gray-800 border-slate-200 dark:border-slate-700/50 shadow-sm'
    } else if (isBronze) {
      base +=
        ' bg-gradient-to-r from-orange-50/80 via-white to-white dark:from-orange-900/10 dark:via-gray-800 dark:to-gray-800 border-orange-200 dark:border-orange-800/50 shadow-sm'
    } else if (isCurrentUser) {
      base += ' bg-primary/5 border-primary/30 dark:bg-primary/5 shadow-md'
    } else {
      base +=
        ' bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md'
    }

    if (isCurrentUser) {
      base += ' sticky bottom-4 z-10 md:relative md:bottom-0 md:shadow-none'
    }

    return base
  }

  return (
    <div onClick={() => navigate(`/lenser/${handle}`)} className={getContainerStyles()}>
      <div className="flex-shrink-0 flex items-center justify-center w-12">{getRankBadge()}</div>

      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar
          src={avatarUrl}
          alt={displayName}
          size="md"
          className={isGold ? 'ring-2 ring-yellow-400 dark:ring-yellow-600' : ''}
        />

        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold truncate text-lg ${isCurrentUser ? 'text-primary-900 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}
            >
              {displayName}
            </span>
            {isGold && <Trophy size={16} className="text-yellow-500 fill-current" />}
          </div>
          {handle && (
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">@{handle}</span>
          )}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-8">
        {streak !== undefined && streak > 0 && (
          <div className="flex items-center gap-1.5 text-orange-500 font-semibold" title="Current Streak">
            <Flame size={18} className="fill-current" />
            <span>{streak}</span>
          </div>
        )}

        <div
          className={`px-3 py-1 rounded-full text-xs font-bold ${isGold ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
        >
          Level {level}
        </div>
      </div>

      <div className="flex flex-col items-end min-w-[80px]">
        <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
          {formatCount(totalXp)} <span className="text-sm text-gray-400 font-medium">XP</span>
        </span>
        <div className="md:hidden flex items-center gap-2 mt-1">
          <span
            className={`text-xs font-medium px-2 rounded-full ${isGold ? 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-200' : 'text-gray-500 bg-gray-100 dark:bg-gray-700'}`}
          >
            Lvl {level}
          </span>
        </div>
      </div>

      <div className="hidden md:block text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors">
        <MoreHorizontal size={20} />
      </div>
    </div>
  )
}
