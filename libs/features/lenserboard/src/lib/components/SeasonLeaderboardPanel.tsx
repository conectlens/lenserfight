import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Calendar, Star, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { queryKeys } from '@lenserfight/data/cache'
import { xpService, XP_APP_IDS } from '@lenserfight/data/repositories'
import { Avatar } from '@lenserfight/ui/components'
import { FeaturedChallenge } from '@lenserfight/types'
import { formatCount } from '@lenserfight/utils/number'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ended: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

const SeasonStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? ''}`}>
    {status}
  </span>
)

const ChallengeCard: React.FC<{ challenge: FeaturedChallenge }> = ({ challenge }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
    <Star size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{challenge.title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{challenge.description}</p>
    </div>
    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
      +{challenge.xpReward}
    </span>
  </div>
)

interface SeasonLeaderboardPanelProps {
  className?: string
}

export const SeasonLeaderboardPanel: React.FC<SeasonLeaderboardPanelProps> = ({
  className = '',
}) => {
  const navigate = useNavigate()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>()
  const [showChallenges, setShowChallenges] = useState(false)

  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: queryKeys.xp.seasons(XP_APP_IDS.forum),
    queryFn: () => xpService.getSeasonList(XP_APP_IDS.forum),
    staleTime: 1000 * 60 * 10,
  })

  const activeSeason = seasons?.find((s) => s.status === 'active')
  const effectiveSeasonId = selectedSeasonId ?? activeSeason?.id
  const selectedSeason = seasons?.find((s) => s.id === effectiveSeasonId)

  const { data: leaderboardData, isLoading: lbLoading } = useQuery({
    queryKey: queryKeys.xp.seasonLeaderboard(XP_APP_IDS.forum, effectiveSeasonId),
    queryFn: () => xpService.getSeasonLeaderboard(XP_APP_IDS.forum, effectiveSeasonId, 20, 0),
    staleTime: 1000 * 30,
    enabled: !!effectiveSeasonId,
  })

  if (seasonsLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!seasons?.length) {
    return (
      <div className={`text-center py-12 text-gray-400 ${className}`}>
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No seasons available yet.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Season selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {seasons.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSeasonId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                effectiveSeasonId === s.id
                  ? 'bg-primary text-black'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {selectedSeason && (
          <SeasonStatusBadge status={selectedSeason.status} />
        )}
      </div>

      {/* Season info header */}
      {selectedSeason && (
        <div className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{selectedSeason.name}</h3>
              {selectedSeason.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedSeason.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
              <Calendar size={12} />
              <span>
                {new Date(selectedSeason.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {new Date(selectedSeason.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {selectedSeason.rewardDescription && (
            <div className="flex items-center gap-1.5 text-xs">
              <Trophy size={12} className="text-yellow-500 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">{selectedSeason.rewardDescription}</span>
            </div>
          )}

          {selectedSeason.featuredChallenges.length > 0 && (
            <div>
              <button
                onClick={() => setShowChallenges((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Star size={12} />
                {selectedSeason.featuredChallenges.length} Featured Challenges
                <ChevronDown
                  size={12}
                  className={`transition-transform ${showChallenges ? 'rotate-180' : ''}`}
                />
              </button>

              {showChallenges && (
                <div className="mt-2 space-y-2">
                  {selectedSeason.featuredChallenges.map((c) => (
                    <ChallengeCard key={c.ruleKey} challenge={c} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard list */}
      {lbLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !leaderboardData?.list.length ? (
        <div className="text-center py-10 text-gray-400">
          <Trophy className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No rankings yet for this season.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboardData.list.map((entry) => {
            const isTop3 = entry.rank <= 3
            const borderCls = entry.rank === 1
              ? 'border-yellow-200 dark:border-yellow-700/50'
              : entry.rank === 2
                ? 'border-slate-200 dark:border-slate-700/50'
                : entry.rank === 3
                  ? 'border-orange-200 dark:border-orange-800/50'
                  : 'border-gray-100 dark:border-gray-700'

            return (
              <div
                key={entry.lenserId}
                onClick={() => entry.user.handle && navigate(`/lenser/${entry.user.handle}`)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md bg-white dark:bg-gray-800 ${borderCls}`}
              >
                <span className="w-8 text-center text-sm font-bold text-gray-400 flex-shrink-0">
                  {isTop3 ? (
                    <span
                      className={`inline-block w-7 h-7 rounded-full flex items-center justify-center font-black text-sm ${
                        entry.rank === 1
                          ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-950 shadow-md'
                          : entry.rank === 2
                            ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800'
                            : 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900'
                      }`}
                    >
                      {entry.rank}
                    </span>
                  ) : (
                    `#${entry.rank}`
                  )}
                </span>

                <Avatar
                  src={entry.user.avatarUrl}
                  alt={entry.user.displayName}
                  size="sm"
                  className="!w-8 !h-8 flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {entry.user.displayName}
                  </p>
                  {entry.user.handle && (
                    <p className="text-xs text-gray-400 truncate">@{entry.user.handle}</p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCount(entry.totalXp)} XP
                  </p>
                  <p className="text-xs text-gray-400">Season</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
