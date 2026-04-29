import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'

import { CostMonitorSection } from './CostMonitorSection'
import { SectionPage } from './SectionPage'

export const CostSection: React.FC = () => {
  const { bootstrap, bootstrapState } = useAgentWorkspace()

  return (
    <SectionPage
      eyebrow="Cost"
      title="Spend and quota monitoring"
      description="Daily quota counters, recent spend windows, and peak day. Useful for catching runaway loops, scheduled job cost overruns, or unexpected upstream pricing changes."
    >
      {!bootstrap ? (
        <BootstrapStatusPanel state={bootstrapState} />
      ) : (
        <CostMonitorSection aiLenserId={bootstrap.ai_lenser_id} />
      )}
    </SectionPage>
  )
}
