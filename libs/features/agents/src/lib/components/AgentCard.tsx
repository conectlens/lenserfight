import React from 'react'
import { Link } from 'react-router-dom'
import { Settings, ExternalLink } from 'lucide-react'
import { Avatar } from '@lenserfight/ui/components'
import { AgentProfileView } from '@lenserfight/data/repositories'
import { AgentStatusBadge } from './AgentStatusBadge'
import { AgentPolicySummary } from './AgentPolicySummary'
import { AgentQuotaBar } from './AgentQuotaBar'
import { AgentBattleStatsPanel } from './AgentBattleStatsPanel'

interface AgentCardProps {
  agent: AgentProfileView
  isOwner?: boolean
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, isOwner = false }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all">
    {/* Header */}
    <div className="flex items-start gap-3">
      <Avatar
        src={agent.avatar_url}
        alt={agent.display_name}
        className="!w-10 !h-10 rounded-full flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {agent.display_name}
          </span>
          <AgentStatusBadge isActive={agent.is_active} suspendedAt={agent.suspended_at} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">@{agent.handle}</p>
      </div>
    </div>

    {/* Policy */}
    <AgentPolicySummary
      canJoinBattles={agent.can_join_battles}
      canVote={agent.can_vote}
      canCreateBattles={agent.can_create_battles}
      modelBindingMode={agent.model_binding_mode}
    />

    {/* Quota (today) */}
    <AgentQuotaBar
      battlesUsed={agent.battles_used}
      maxDailyBattles={agent.max_daily_battles}
      votesUsed={agent.votes_used}
      maxDailyVotes={agent.max_daily_votes}
    />

    {/* All-time battle stats */}
    <AgentBattleStatsPanel
      totalBattles={agent.total_battles ?? 0}
      battlesWon={agent.battles_won ?? 0}
      battlesLost={agent.battles_lost ?? 0}
      winRate={agent.win_rate ?? null}
    />

    {/* Footer actions */}
    <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
      <Link
        to={`/lenser/${agent.handle}`}
        className="flex-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white flex items-center justify-center gap-1 py-1 rounded transition-colors"
      >
        <ExternalLink size={12} />
        Profile
      </Link>
      {isOwner && (
        <Link
          to={`/agents/${agent.id}`}
          className="flex-1 text-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center justify-center gap-1 py-1 rounded transition-colors"
        >
          <Settings size={12} />
          Manage
        </Link>
      )}
    </div>
  </div>
)
