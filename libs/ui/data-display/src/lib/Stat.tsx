import React from 'react'

export interface StatProps {
  label: string
  value: React.ReactNode
  delta?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  className?: string
}

export interface MetricCardProps {
  stats: StatProps[]
  className?: string
}

const deltaColors = {
  up:      'text-status-green',
  down:    'text-status-red',
  neutral: 'text-greyscale-500',
}

const deltaIcons = {
  up:      '↑',
  down:    '↓',
  neutral: '→',
}

/**
 * Single metric with optional trend delta.
 *
 * @example
 * <Stat label="Followers" value="1,240" delta={{ value: '+12%', direction: 'up' }} />
 */
export const Stat: React.FC<StatProps> = ({ label, value, delta, icon, className = '' }) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-greyscale-500 uppercase tracking-wide">
        {icon && <span className="text-greyscale-400">{icon}</span>}
        {label}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-greyscale-900 dark:text-greyscale-100 tabular-nums">
          {value}
        </span>
        {delta && (
          <span className={`text-xs font-medium pb-0.5 ${deltaColors[delta.direction]}`}>
            {deltaIcons[delta.direction]} {delta.value}
          </span>
        )}
      </div>
    </div>
  )
}

Stat.displayName = 'Stat'

/**
 * Grid of Stat cells inside a single card surface.
 *
 * @example
 * <MetricCard stats={[{ label: 'Views', value: '8.4k' }, { label: 'Likes', value: '320' }]} />
 */
export const MetricCard: React.FC<MetricCardProps> = ({ stats, className = '' }) => {
  return (
    <div
      className={`
        rounded-2xl bg-surface-raised shadow-neu-2
        p-5 grid gap-6
        grid-cols-2 sm:grid-cols-${Math.min(stats.length, 4)}
        ${className}
      `}
    >
      {stats.map((stat, i) => (
        <Stat key={i} {...stat} />
      ))}
    </div>
  )
}

MetricCard.displayName = 'MetricCard'
