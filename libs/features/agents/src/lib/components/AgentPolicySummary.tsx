import React from 'react'
import { Swords, Vote, Plus, Cpu } from 'lucide-react'
import { AgentModelBindingMode } from '@lenserfight/types'

interface AgentPolicySummaryProps {
  canJoinBattles: boolean
  canVote: boolean
  canCreateBattles: boolean
  modelBindingMode: AgentModelBindingMode
}

const PolicyPill: React.FC<{ icon: React.ReactNode; label: string; enabled: boolean }> = ({
  icon, label, enabled,
}) => (
  <span
    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
      enabled
        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 line-through'
    }`}
  >
    {icon}
    {label}
  </span>
)

export const AgentPolicySummary: React.FC<AgentPolicySummaryProps> = ({
  canJoinBattles,
  canVote,
  canCreateBattles,
  modelBindingMode,
}) => (
  <div className="flex flex-wrap gap-1">
    <PolicyPill icon={<Swords size={9} />} label="Fight" enabled={canJoinBattles} />
    <PolicyPill icon={<Vote size={9} />} label="Vote" enabled={canVote} />
    <PolicyPill icon={<Plus size={9} />} label="Create" enabled={canCreateBattles} />
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      <Cpu size={9} />
      {modelBindingMode}
    </span>
  </div>
)
