import { ClipboardList } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { ApprovalQueueSection } from './ApprovalQueueSection'
import { SectionPage } from './SectionPage'

export const ApprovalsSection: React.FC = () => {
  const { bootstrap } = useAgentWorkspace()

  return (
    <SectionPage
      eyebrow="Approvals"
      title="Human approval gates"
      description="Outbound side effects pause here until a human approves, rejects, or modifies. Approving resumes the workflow run; rejecting cancels it."
    >
      {bootstrap ? (
        <ApprovalQueueSection aiLenserId={bootstrap.ai_lenser_id} />
      ) : (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="Workspace not bootstrapped"
          description="The approval queue requires the workspace bootstrap to load first."
        />
      )}
    </SectionPage>
  )
}
