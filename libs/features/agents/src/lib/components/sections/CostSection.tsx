import { Coins } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { EmptyPanel } from '../EmptyPanel'

import { CostMonitorSection } from './CostMonitorSection'
import { SectionPage } from './SectionPage'

export const CostSection: React.FC = () => {
  const { bootstrap, bootstrapState } = useAgentWorkspace()

  return (
    <SectionPage
      eyebrow="Cost"
      docsPath="/how-to/agents/workspace/cost"
      docsTip="Current month spend per provider + model, plus quota counters. Exceeding a monthly cap blocks new runs and emits a notification."
      title="Spend and quota monitoring"
      description="Daily quota counters, recent spend windows, and peak day. Useful for catching runaway loops, scheduled job cost overruns, or unexpected upstream pricing changes."
    >
      {!bootstrap ? (
        bootstrapState.kind === 'idle' ? (
          <EmptyPanel
            icon={<Coins size={20} />}
            title="No cost data"
            description="Open an AI lenser workspace to view quota snapshots and spend."
          />
        ) : (
          <BootstrapStatusPanel state={bootstrapState} />
        )
      ) : (
        <CostMonitorSection aiLenserId={bootstrap.ai_lenser_id} />
      )}
    </SectionPage>
  )
}
