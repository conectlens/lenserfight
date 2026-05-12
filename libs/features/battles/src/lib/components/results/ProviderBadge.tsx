import React from 'react'
import type { FundingSource } from '@lenserfight/types'

interface ProviderBadgeProps {
  fundingSource: FundingSource | string | null | undefined
  className?: string
}

interface BadgeConfig {
  label: string
  icon: string
  colorClass: string
  title: string
}

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  user_byok_cloud: {
    label: 'BYOK Cloud',
    icon: '🔑',
    colorClass: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
    title: 'Executed with your own API key on a cloud provider',
  },
  user_byok_local: {
    label: 'Local',
    icon: '🖥',
    colorClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700',
    title: 'Executed locally on your machine',
  },
  platform_credit: {
    label: 'Platform',
    icon: '⚡',
    colorClass: 'bg-primary-yellow-100 text-primary-yellow-900 border-primary-yellow-300 dark:bg-primary-yellow-900/20 dark:text-primary-yellow-300 dark:border-primary-yellow-700',
    title: 'Executed using LenserFight platform credits',
  },
  sponsored: {
    label: 'Sponsored',
    icon: '🏅',
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    title: 'Sponsored execution — cost covered by a provider or partner',
  },
}

const FALLBACK_CONFIG: BadgeConfig = {
  label: 'Unknown',
  icon: '❓',
  colorClass: 'bg-surface-interactive text-surface-text-muted border-surface-border',
  title: 'Execution provider unknown',
}

export function ProviderBadge({ fundingSource, className = '' }: ProviderBadgeProps) {
  const cfg = (fundingSource && BADGE_CONFIG[fundingSource]) ?? FALLBACK_CONFIG

  return (
    <span
      title={cfg.title}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.colorClass} ${className}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}
