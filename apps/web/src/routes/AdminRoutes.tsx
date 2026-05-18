import { RouteGuard } from '@lenserfight/ui/routing'
import React, { lazy } from 'react'
import { Route } from 'react-router-dom'

import { DashboardFrame } from '../shell/DashboardFrame'

const LazyAdminDashboardPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.AdminDashboardPage }))
)
const LazyAdminBattlesPanelPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.AdminBattlesPanelPage }))
)
const LazyKillSwitchAdminPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.KillSwitchAdminPage }))
)
const LazyPlatformFlagsAdminPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.PlatformFlagsAdminPage }))
)
const LazyVoteAnomaliesPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.VoteAnomaliesPage }))
)

const AdminFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DashboardFrame>
    <RouteGuard accessCheck={({ isSuperAdmin }) => isSuperAdmin}>
      {children}
    </RouteGuard>
  </DashboardFrame>
)

export const AdminRoutes: React.FC = () => (
  <>
    <Route path="/admin" element={<AdminFrame><LazyAdminDashboardPage /></AdminFrame>} />
    <Route
      path="/admin/battles/moderation"
      element={<AdminFrame><LazyAdminBattlesPanelPage /></AdminFrame>}
    />
    <Route
      path="/admin/kill-switches"
      element={<AdminFrame><LazyKillSwitchAdminPage /></AdminFrame>}
    />
    <Route
      path="/admin/kill-switch"
      element={<AdminFrame><LazyPlatformFlagsAdminPage /></AdminFrame>}
    />
    <Route
      path="/admin/vote-anomalies"
      element={<AdminFrame><LazyVoteAnomaliesPage /></AdminFrame>}
    />
  </>
)
