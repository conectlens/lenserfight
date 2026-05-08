import { Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Shield, Star, Trophy, Zap } from 'lucide-react'
import React from 'react'

const LEADERBOARD = [
  { rank: 1, handle: 'atlas_lenser', xp: 12_480, level: 18, badge: Trophy },
  { rank: 2, handle: 'neon_oracle', xp: 9_210, level: 14, badge: Star },
  { rank: 3, handle: 'lens_weaver', xp: 7_055, level: 12, badge: Shield },
]

const BADGES = [
  { label: 'First Blood', color: 'bg-red-500/15 text-red-700 dark:text-red-400' },
  { label: 'Voting Machine', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  { label: 'AI Slayer', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  { label: 'Legend', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400' },
]

export function GamificationPreview() {
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
              <p className="text-xs font-semibold text-greyscale-500">Your level</p>
              <p className="text-lg font-black text-greyscale-900 dark:text-greyscale-0">Level 7</p>
            </div>
          </div>
          <span className="text-2xl font-black text-greyscale-900 dark:text-greyscale-0">2 340 XP</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-greyscale-500">
            <span>Progress to Level 8</span>
            <span>2 340 / 3 000</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
            <motion.div
              className="h-full rounded-full bg-primary-yellow-500"
              initial={{ width: 0 }}
              whileInView={{ width: '78%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0, 0, 0.2, 1] }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Votes cast', value: '47' },
            { label: 'Battles won', value: '8' },
            { label: 'Lenses created', value: '12' },
            { label: 'Streak', value: '5 days' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-surface-raised p-3">
              <p className="text-xs text-greyscale-500">{label}</p>
              <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {BADGES.map(({ label, color }) => (
            <span key={label} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
              {label}
            </span>
          ))}
        </div>
      </Card>

      {/* Leaderboard Card */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-primary-yellow-700 dark:text-primary-yellow-400" />
          <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">Season Leaderboard</p>
        </div>

        <div className="space-y-2">
          {LEADERBOARD.map(({ rank, handle, xp, level, badge: BadgeIcon }) => (
            <motion.div
              key={handle}
              className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-base p-3"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: rank * 0.08, duration: 0.28, ease: [0, 0, 0.2, 1] }}
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
                <p className="truncate text-xs font-semibold text-greyscale-900 dark:text-greyscale-0">@{handle}</p>
                <p className="text-xs text-greyscale-500">Lv {level}</p>
              </div>
              <span className="text-xs font-bold text-greyscale-900 dark:text-greyscale-0 shrink-0">
                {xp.toLocaleString()} XP
              </span>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-greyscale-400">
          Season resets in 47 days · Earn XP by voting, creating, and winning
        </p>
      </Card>
    </div>
  )
}
