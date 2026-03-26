import { Dialog } from '@lenserfight/ui/overlays'
import { useModalRouter } from '@lenserfight/ui/routing'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { CreateWorkflowWizard } from './CreateWorkflowWizard'

const MODAL_NAME = 'create-workflow'

/**
 * Global query-param-driven modal for creating a workflow.
 *
 * Activated via: useModalRouter().open('create-workflow')
 * URL shape:     ?modal=create-workflow
 *
 * On creation, navigates to /workflows/:id.
 * Mount once in App.tsx outside the Routes tree.
 */
export const CreateWorkflowWizardModal: React.FC = () => {
  const { isOpen, close } = useModalRouter()
  const navigate = useNavigate()

  if (!isOpen(MODAL_NAME)) return null

  return (
    <Dialog open onClose={close} maxWidth="max-w-2xl" dismissOnBackdrop>
      <CreateWorkflowWizard
        onCreated={(workflowId) => {
          close()
          navigate(`/workflows/${workflowId}`)
        }}
        onCancel={close}
      />
    </Dialog>
  )
}
