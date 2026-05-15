import React from 'react'

export interface VersionBadgeProps {
  versionNumber: number | null
  status?: 'draft' | 'published' | 'archived'
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const sizeClass: Record<NonNullable<VersionBadgeProps['size']>, string> = {
  xs: 'px-1.5 py-0 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

const statusColor: Record<string, string> = {
  draft: 'bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400',
  published: 'bg-status-green/15 text-status-green',
  archived: 'bg-greyscale-100 text-greyscale-500 dark:bg-greyscale-800 dark:text-greyscale-400',
}

const statusDot: Record<string, string> = {
  draft: 'bg-primary-yellow-500',
  published: 'bg-status-green',
  archived: 'bg-greyscale-400',
}

export function VersionBadge({ versionNumber, status, size = 'sm', className = '' }: VersionBadgeProps) {
  const colorClass = status ? (statusColor[status] ?? statusColor.draft) : 'bg-greyscale-100 text-greyscale-600 dark:bg-greyscale-800 dark:text-greyscale-300'
  const dotClass = status ? (statusDot[status] ?? statusDot.draft) : 'bg-greyscale-400'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass[size]} ${colorClass} ${className}`}
      title={status ? `v${versionNumber ?? '?'} · ${status}` : `v${versionNumber ?? '?'}`}
    >
      {status && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      <span>v{versionNumber ?? '?'}</span>
      {status && <span className="opacity-60">· {status}</span>}
    </span>
  )
}
