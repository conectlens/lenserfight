import { useLenserWorkspace, useWorkspaceSwitchController } from '@lenserfight/features/profile'
import { Bot, ChevronLeft } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../context/AgentWorkspaceContext'

export const ActiveWorkspaceBanner: React.FC = () => {
  const { viewMode, profile, isSwitching } = useAgentWorkspace()
  const { humanWorkspace } = useLenserWorkspace()
  const { switchToProfile } = useWorkspaceSwitchController()

  if (viewMode !== 'agent_owner') return null

  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-primary-yellow-200 bg-primary-yellow-50 px-4 py-2.5 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10">
      <Bot size={14} className="shrink-0 text-primary-yellow-700 dark:text-primary-yellow-400" />
      <span className="flex-1 text-sm font-semibold text-primary-yellow-800 dark:text-primary-yellow-300">
        AI workspace active — @{profile.handle}
      </span>
      {humanWorkspace && (
        <button
          type="button"
          onClick={() => switchToProfile(humanWorkspace)}
          disabled={isSwitching}
          className="inline-flex items-center gap-1 rounded-[10px] border border-primary-yellow-300 bg-white px-2.5 py-1 text-xs font-semibold text-primary-yellow-800 transition hover:bg-primary-yellow-100 disabled:opacity-50 dark:border-primary-yellow-500/40 dark:bg-transparent dark:text-primary-yellow-300 dark:hover:bg-primary-yellow-500/10"
        >
          <ChevronLeft size={12} />
          {isSwitching ? 'Switching…' : `@${humanWorkspace.handle}`}
        </button>
      )}
    </div>
  )
}
