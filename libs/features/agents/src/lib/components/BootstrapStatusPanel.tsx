import { AlertTriangle, Loader, Sparkles } from 'lucide-react'
import React from 'react'

import type { AgentWorkspaceBootstrapState } from '../context/AgentWorkspaceContext'

import { EmptyPanel } from './EmptyPanel'

interface BootstrapStatusPanelProps {
  state: AgentWorkspaceBootstrapState
  action?: React.ReactNode
}

const BOOTSTRAP_DESCRIPTION =
  'The workspace bootstrap RPC loads the selected AI lenser\'s teams, runs, reusable profiles, and workflow assignments so the control room can render safely.'

export const BootstrapStatusPanel: React.FC<BootstrapStatusPanelProps> = ({
  state,
  action,
}) => {
  if (state.kind === 'ready' || state.kind === 'idle') {
    return null
  }

  if (state.kind === 'loading') {
    return (
        <EmptyPanel
        icon={<Loader size={20} className="animate-spin" />}
        title="Loading workspace bootstrap"
        description={BOOTSTRAP_DESCRIPTION}
      >
        {action}
      </EmptyPanel>
    )
  }

  if (state.kind === 'missing') {
    return (
      <EmptyPanel
        icon={<Sparkles size={20} />}
        title="Workspace bootstrap is empty"
        description={`${BOOTSTRAP_DESCRIPTION} This usually means the AI workspace has not been fully initialized yet.`}
      >
        {action}
      </EmptyPanel>
    )
  }

  return (
    <EmptyPanel
      icon={<AlertTriangle size={20} />}
      title="Workspace bootstrap failed"
      description={`${BOOTSTRAP_DESCRIPTION} ${state.message ?? 'Review the supporting migration, ownership helpers, and RLS policies before using this workspace in production.'}`}
    >
      {action}
    </EmptyPanel>
  )
}
