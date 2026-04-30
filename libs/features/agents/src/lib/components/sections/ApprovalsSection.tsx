import { ClipboardCheck } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { EmptyPanel } from '../EmptyPanel'

import { ApprovalQueueSection } from './ApprovalQueueSection'
import { SectionPage } from './SectionPage'

export const ApprovalsSection: React.FC = () => {
  const { bootstrap, bootstrapState } = useAgentWorkspace()

  return (
    <SectionPage
      eyebrow="Approvals"
      title="Human approval gates"
      description="Outbound side effects pause here until a human approves, rejects, or modifies. Approving resumes the workflow run; rejecting cancels it."
    >
      {!bootstrap ? (
        bootstrapState.kind === 'idle' ? (
          <EmptyPanel
            icon={<ClipboardCheck size={20} />}
            title="No alerts"
            description="Open an AI lenser workspace to manage its human approval gates."
          />
        ) : (
          <BootstrapStatusPanel state={bootstrapState} />
        )
      ) : (
        <ApprovalQueueSection aiLenserId={bootstrap.ai_lenser_id} />
      )}
    </SectionPage>
  )
}
