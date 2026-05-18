import React, { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'

import { DashboardFrame } from '../shell/DashboardFrame'

const LazySettingsPage = lazy(() =>
  import('@lenserfight/features/settings').then((module) => ({ default: module.SettingsPage }))
)
const LazyAccountDashboardPage = lazy(() =>
  import('@lenserfight/features/account').then((module) => ({ default: module.AccountDashboardPage }))
)
const LazyDeviceListPage = lazy(() =>
  import('@lenserfight/features/devices').then((module) => ({ default: module.DeviceListPage }))
)
const LazyDeviceDetailPage = lazy(() =>
  import('@lenserfight/features/devices').then((module) => ({ default: module.DeviceDetailPage }))
)
const LazyGatewayDaemonsPage = lazy(() =>
  import('@lenserfight/features/devices').then((module) => ({ default: module.GatewayDaemonsPage }))
)
const LazyNotificationsPage = lazy(() =>
  import('@lenserfight/features/notifications').then((module) => ({ default: module.NotificationsPage }))
)
const LazyWaitingListPage = lazy(() =>
  import('@lenserfight/features/waiting-list').then((module) => ({ default: module.WaitingListPage }))
)

export const AccountRoutes: React.FC = () => (
  <>
    <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
    <Route
      path="/settings/:tab"
      element={
        <DashboardFrame>
          <LazySettingsPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/settings/gateway"
      element={
        <DashboardFrame>
          <LazyGatewayDaemonsPage />
        </DashboardFrame>
      }
    />

    <Route path="/account" element={<Navigate to="/account/dashboard" replace />} />
    <Route
      path="/account/dashboard"
      element={
        <DashboardFrame>
          <LazyAccountDashboardPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/account/devices"
      element={
        <DashboardFrame>
          <LazyDeviceListPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/account/devices/:id"
      element={
        <DashboardFrame>
          <LazyDeviceDetailPage />
        </DashboardFrame>
      }
    />

    <Route
      path="/notifications"
      element={
        <DashboardFrame>
          <LazyNotificationsPage />
        </DashboardFrame>
      }
    />
    <Route
      path="/waiting-list"
      element={
        <DashboardFrame>
          <LazyWaitingListPage />
        </DashboardFrame>
      }
    />
  </>
)
