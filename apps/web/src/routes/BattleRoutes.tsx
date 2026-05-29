import { ModalRoute } from '@lenserfight/ui/routing'
import React, { lazy } from 'react'
import { Route, useNavigate } from 'react-router-dom'

import { DashboardFrame } from '../shell/DashboardFrame'

const LazyBattlesFeedPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattlesFeedPage }))
)
const LazyBattlesDiscoveryPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattlesDiscoveryPage }))
)
const LazyArenaBattlesDiscoveryPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.ArenaBattlesDiscoveryPage }))
)
const LazyBattleLenserboardPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleLenserboardPage }))
)
const LazyBattleTemplatesPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleTemplatesPage }))
)
const LazyBattleTemplateEditorPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleTemplateEditorPage }))
)
const LazyBattleSeriesPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleSeriesPage }))
)
const LazySeriesListPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.SeriesListPage }))
)
const LazyCreateBattleWizard = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.CreateBattleWizard }))
)
const LazyBattleDetailPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleDetailPage }))
)
const LazyBattleResultPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleResultPage }))
)
const LazyBattleReplayPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleReplayPage }))
)
const LazyJoinBattlePage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.JoinBattlePage }))
)
const LazyTournamentPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.TournamentPage }))
)

const CreateBattleRoute: React.FC = () => {
  const navigate = useNavigate()
  const close = () => navigate('/battles')
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-3xl"
      onClose={close}
    >
      <LazyCreateBattleWizard
        onSuccess={(slug) => navigate(`/battles/${slug}`)}
        onClose={close}
      />
    </ModalRoute>
  )
}

const CreateTemplateRoute: React.FC = () => {
  const navigate = useNavigate()
  const close = () => navigate('/battles')
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-2xl"
      onClose={close}
    >
      <LazyBattleTemplateEditorPage
        onSuccess={close}
        onClose={close}
      />
    </ModalRoute>
  )
}

export function BattleRoutes(): React.ReactElement {
  return (
  <>
    <Route
      path="/battles"
      element={
        <DashboardFrame>
          <LazyBattlesFeedPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/arena"
      element={
        <DashboardFrame>
          <LazyArenaBattlesDiscoveryPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/browse"
      element={
        <DashboardFrame>
          <LazyBattlesDiscoveryPage />
        </DashboardFrame>
      }
    />
    <Route path="/battles/lenserboard" element={<LazyBattleLenserboardPage />} />
    <Route
      path="/battles/templates"
      element={
        <DashboardFrame>
          <LazyBattleTemplatesPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/templates/new"
      element={
        <DashboardFrame>
          <CreateTemplateRoute />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/templates/:id/edit"
      element={
        <DashboardFrame>
          <CreateTemplateRoute />
        </DashboardFrame>
      }
    />
    <Route
      path="/series"
      element={
        <DashboardFrame>
          <LazySeriesListPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/series/:id"
      element={
        <DashboardFrame>
          <LazyBattleSeriesPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/series/:id"
      element={
        <DashboardFrame>
          <LazyBattleSeriesPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/create"
      element={
        <DashboardFrame>
          <CreateBattleRoute />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/new"
      element={
        <DashboardFrame>
          <CreateBattleRoute />
        </DashboardFrame>
      }
    />
    <Route path="/battles/:slug" element={<LazyBattleDetailPage />} />
    <Route path="/battles/:slug/result" element={<LazyBattleResultPage />} />
    <Route
      path="/battles/:slug/replay"
      element={
        <DashboardFrame>
          <LazyBattleReplayPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/battles/:slug/join"
      element={
        <DashboardFrame>
          <LazyJoinBattlePage />
        </DashboardFrame>
      }
    />
    <Route path="/tournaments/:slug" element={<LazyTournamentPage />} />
  </>
  )
}
