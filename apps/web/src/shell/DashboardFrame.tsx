import { ChainabitWalletGate } from '@lenserfight/features/store'
import { GlobalErrorRenderer } from '@lenserfight/shared/error'
import { UIProvider } from '@lenserfight/ui/providers'
import React, { lazy } from 'react'

const LazyDashboardLayout = lazy(() =>
  import('@lenserfight/features/shell').then((module) => ({ default: module.DashboardLayout }))
)

export const DashboardFrame: React.FC<{ children: React.ReactNode; fullscreen?: boolean }> = ({
  children,
  fullscreen,
}) => (
  <ChainabitWalletGate>
    <UIProvider>
      <LazyDashboardLayout fullscreen={fullscreen}>
        <GlobalErrorRenderer>{children}</GlobalErrorRenderer>
      </LazyDashboardLayout>
    </UIProvider>
  </ChainabitWalletGate>
)
