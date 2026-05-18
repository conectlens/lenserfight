import { ModalRoute } from '@lenserfight/ui/routing'
import React, { lazy } from 'react'
import { Route, useNavigate, useParams } from 'react-router-dom'

import { DashboardFrame } from '../shell/DashboardFrame'

const LazyWorkflowsPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowsPage }))
)
const LazyWorkflowBuilderPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowBuilderPage }))
)
const LazyWorkflowTemplateGalleryPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowTemplateGalleryPage }))
)
const LazyCreateWorkflowWizard = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.CreateWorkflowWizard }))
)
const LazyWorkflowRunMediaPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowRunMediaPage }))
)

const WorkflowsPageRoute: React.FC = () => {
  const navigate = useNavigate()
  return <LazyWorkflowsPage onCreateWorkflow={() => navigate('/workflows/manage')} />
}

const WorkflowBuilderPageRoute: React.FC = () => {
  const { id, runId } = useParams<{ id: string; runId?: string }>()
  const navigate = useNavigate()
  return (
    <LazyWorkflowBuilderPage
      workflowId={id!}
      runId={runId}
      onBattleClick={(workflowId) => navigate(`/battles/create?workflow_id=${workflowId}`)}
    />
  )
}

const CreateWorkflowModal: React.FC = () => {
  const navigate = useNavigate()
  const close = () => navigate('/workflows')
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-2xl"
      onClose={close}
    >
      <LazyCreateWorkflowWizard
        onCreated={(workflowId) => navigate(`/workflows/${workflowId}`)}
        onCancel={close}
      />
    </ModalRoute>
  )
}

export function WorkflowRoutes(): React.ReactElement {
  return (
  <>
    <Route
      path="/workflows"
      element={
        <DashboardFrame>
          <WorkflowsPageRoute />
        </DashboardFrame>
      }
    >
      <Route path="manage" element={<CreateWorkflowModal />} />
    </Route>

    <Route
      path="/workflows/templates"
      element={
        <DashboardFrame>
          <LazyWorkflowTemplateGalleryPage />
        </DashboardFrame>
      }
    />

    <Route
      path="/workflows/:id"
      element={
        <DashboardFrame fullscreen>
          <WorkflowBuilderPageRoute />
        </DashboardFrame>
      }
    />

    <Route
      path="/workflows/:id/run/:runId"
      element={
        <DashboardFrame fullscreen>
          <WorkflowBuilderPageRoute />
        </DashboardFrame>
      }
    />

    <Route
      path="/workflows/:workflowId/run/:runId/media"
      element={
        <DashboardFrame>
          <LazyWorkflowRunMediaPage />
        </DashboardFrame>
      }
    />
  </>
  )
}
