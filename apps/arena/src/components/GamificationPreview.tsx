import { Card } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { xpService, XP_APP_IDS } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, Star, Trophy, Zap } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { LenserBadge, SeasonLeaderboardEntry, XPSeason, XPSummary } from '@lenserfight/types'

const ARENA_APP_ID = XP_APP_IDS.arena

const RANK_ICONS = [Trophy, Star, Shield]
const BADGE_COLORS = [
  'bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400',
  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'bg-red-500/15 text-red-700 dark:text-red-400',
  'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'bg-green-500/15 text-green-700 dark:text-green-400',
]

function daysUntil(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000))
}

function formatXP(n: number): string {
  return n.toLocaleString()
}

function XPProgressBar({ pct }: { pct: number }) {
  return (
    <motion.div
      className="h-full rounded-full bg-primary-yellow-500"
      initial={{ width: 0 }}
      whileInView={{ width: `${pct}%` }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: [0, 0, 0.2, 1] }}
    />
  )
}

export function GamificationPreview() {
  const { t } = useTranslation('gamification')
  const { user, isAuthenticated } = useAuth()

  const { data: xpSummary } = useQuery<XPSummary | null>({
    queryKey: ['xp', 'summary', user?.id ?? 'anon', ARENA_APP_ID],
    queryFn: () => (user?.id ? xpService.getStats(user.id, ARENA_APP_ID) : null),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60_000,
  })

  const { data: badges = [] } = useQuery<LenserBadge[]>({
    queryKey: ['xp', 'badges', user?.id ?? 'anon'],
    queryFn: () => (user?.id ? xpService.getBadges(user.id) : []),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 120_000,
  })

  const { data: xpHistory = [] } = useQuery({
    queryKey: ['xp', 'history', user?.id ?? 'anon'],
    queryFn: () => (user?.id ? xpService.getHistory(user.id) : []),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60_000,
  })

  const { data: seasonData } = useQuery<{ list: SeasonLeaderboardEntry[]; userEntry?: SeasonLeaderboardEntry | null }>({
    queryKey: ['xp', 'season-leaderboard', ARENA_APP_ID],
    queryFn: () => xpService.getSeasonLeaderboard(ARENA_APP_ID, undefined, 3, 0),
    staleTime: 60_000,
  })

  const { data: activeSeason } = useQuery<XPSeason | null>({
    queryKey: ['xp', 'active-season', ARENA_APP_ID],
    queryFn: () => xpService.getActiveSeason(ARENA_APP_ID),
    staleTime: 300_000,
  })

  // Derive stat counts from XP history action keys
  const votesCast = xpHistory.filter((e) => e.action === 'BATTLE_VOTED').length
  const battlesWon = xpHistory.filter((e) => e.action === 'BATTLE_WON').length
  const lensesCreated = xpHistory.filter((e) => e.action === 'BATTLE_CREATED').length

  const level = xpSummary?.currentLevel ?? null
  const totalXp = xpSummary?.totalXp ?? null
  const minXp = xpSummary?.currentLevelMinXp ?? 0
  const maxXp = xpSummary?.currentLevelMaxXp ?? null
  const progressPct = maxXp && totalXp != null ? Math.min(100, Math.round(((totalXp - minXp) / (maxXp - minXp)) * 100)) : 0

  const leaderboard = seasonData?.list ?? []
  const seasonDaysLeft = activeSeason?.endsAt ? daysUntil(activeSeason.endsAt) : null

  const showUserStats = isAuthenticated && xpSummary != null
  const showLeaderboard = leaderboard.length > 0

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {/* XP Level Card */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-greyscale-500">{t('xp.yourLevel')}</p>
              {showUserStats ? (
                <p className="text-lg font-black text-greyscale-900 dark:text-greyscale-0">{t('xp.level', { level })}</p>
              ) : (
                <p className="text-lg font-black text-greyscale-900 dark:text-greyscale-0">{t('xp.noLevel')}</p>
              )}
            </div>
          </div>
          <span className="text-2xl font-black text-greyscale-900 dark:text-greyscale-0">
            {showUserStats ? t('xp.xpLabel', { xp: formatXP(totalXp!) }) : t('xp.noXp')}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-greyscale-500">
            <span>{showUserStats && maxXp ? t('xp.progressToLevel', { level: level! + 1 }) : t('xp.xpProgress')}</span>
            <span>
              {showUserStats && maxXp
                ? `${formatXP(totalXp!)} / ${formatXP(maxXp)}`
                : isAuthenticated ? '…' : t('xp.signInToTrack')}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
            <XPProgressBar pct={showUserStats ? progressPct : 0} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: t('stats.votesCast'), value: showUserStats ? String(votesCast) : '—' },
            { label: t('stats.battlesWon'), value: showUserStats ? String(battlesWon) : '—' },
            { label: t('stats.lensesCreated'), value: showUserStats ? String(lensesCreated) : '—' },
            { label: t('stats.streak'), value: '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-surface-raised p-3">
              <p className="text-xs text-greyscale-500">{label}</p>
              <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">{value}</p>
            </div>
          ))}
        </div>

        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, 5).map(({ label }, i) => (
              <span
                key={label}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_COLORS[i % BADGE_COLORS.length]}`}
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-greyscale-400">
            {isAuthenticated ? t('badges.earnBadges') : t('badges.signInBadges')}
          </p>
        )}
      </Card>

      {/* Leaderboard Card */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-primary-yellow-700 dark:text-primary-yellow-400" />
          <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">{t('leaderboard.title')}</p>
        </div>

        <div className="space-y-2">
          {showLeaderboard ? (
            leaderboard.map(({ rank, user: u, totalXp: entryXp }, i) => {
              const BadgeIcon = RANK_ICONS[i] ?? Shield
              return (
                <motion.div
                  key={`${rank}-${u.handle ?? i}`}
                  className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-base p-3"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.28, ease: [0, 0, 0.2, 1] }}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    rank === 1
                      ? 'bg-primary-yellow-500 text-greyscale-900'
                      : 'bg-surface-raised text-greyscale-500'
                  }`}>
                    {rank}
                  </span>
                  <BadgeIcon size={14} className="text-greyscale-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-greyscale-900 dark:text-greyscale-0">
                      {u.handle ? `@${u.handle}` : u.displayName}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-greyscale-900 dark:text-greyscale-0 shrink-0">
                    {formatXP(entryXp)} XP
                  </span>
                </motion.div>
              )
            })
          ) : (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-raised" />
            ))
          )}
        </div>

        <p className="text-center text-xs text-greyscale-400">
          {seasonDaysLeft != null
            ? t('leaderboard.seasonResets', { days: seasonDaysLeft })
            : t('leaderboard.earnXp')}
        </p>
      </Card>
    </div>
  )
}
