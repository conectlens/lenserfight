import React from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@lenserfight/ui/components'

export interface AgentIdentityCardProps {
  displayName: string
  handle: string
  avatarSrc?: string | null
  modelCount: number
  lensCount: number
  runtimePref: string
  suspendedReason?: string | null
  /** UUID of the agent — when provided, the card name links to /lensers/:agentUuid */
  agentUuid?: string
  /** Slot: inject <AgentStatusBadge /> from feature layer to avoid cross-boundary import */
  statusBadge?: React.ReactNode
  className?: string
}

export const AgentIdentityCard: React.FC<AgentIdentityCardProps> = ({
  displayName,
  handle,
  avatarSrc,
  modelCount,
  lensCount,
  runtimePref,
  suspendedReason,
  agentUuid,
  statusBadge,
  className = '',
}) => (
  <div
    className={`bg-surface-raised border border-surface-border rounded-2xl p-4 ${className}`}
  >
    <div className="flex items-center gap-3">
      <Avatar src={avatarSrc} alt={displayName} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {agentUuid ? (
            <Link
              to={`/lensers/${agentUuid}`}
              className="text-base font-bold text-greyscale-900 dark:text-greyscale-50 truncate hover:underline"
            >
              {displayName}
            </Link>
          ) : (
            <span className="text-base font-bold text-greyscale-900 dark:text-greyscale-50 truncate">
              {displayName}
            </span>
          )}
          {statusBadge}
        </div>
        <p className="text-xs text-greyscale-400">@{handle}</p>
      </div>
    </div>

    {suspendedReason && (
      <p className="mt-3 text-xs text-status-red bg-status-red/10 px-3 py-2 rounded-lg">
        {suspendedReason}
      </p>
    )}

    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-lg font-bold text-greyscale-900 dark:text-greyscale-50">{modelCount}</p>
        <p className="text-xs text-greyscale-400">Models</p>
      </div>
      <div>
        <p className="text-lg font-bold text-greyscale-900 dark:text-greyscale-50">{lensCount}</p>
        <p className="text-xs text-greyscale-400">Lenses</p>
      </div>
      <div>
        <p className="text-lg font-bold text-greyscale-900 dark:text-greyscale-50 capitalize">
          {runtimePref}
        </p>
        <p className="text-xs text-greyscale-400">Runtime</p>
      </div>
    </div>
  </div>
)
