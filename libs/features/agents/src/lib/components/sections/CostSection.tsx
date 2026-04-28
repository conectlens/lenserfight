import { Sparkles } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { CostMonitorSection } from './CostMonitorSection'
import { SectionPage } from './SectionPage'

export const CostSection: React.FC = () => {
  const { bootstrap } = useAgentWorkspace()

  return (
    <SectionPage
      eyebrow="Cost"
      title="Spend and quota monitoring"
      description="Daily quota counters, recent spend windows, and peak day. Useful for catching runaway loops, scheduled job cost overruns, or unexpected upstream pricing changes."
    >
      {bootstrap ? (
        <CostMonitorSection aiLenserId={bootstrap.ai_lenser_id} />
      ) : (
        <EmptyPanel
          icon={<Sparkles size={20} />}
          title="Workspace not bootstrapped"
          description="The cost monitor requires the workspace bootstrap to load first."
        />
      )}
    </SectionPage>
  )
}
