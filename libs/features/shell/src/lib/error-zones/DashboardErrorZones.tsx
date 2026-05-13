import { useDashboardErrorZones } from '@lenserfight/shared/error'
import React from 'react'

import { BlockingErrorOverlay } from './BlockingErrorOverlay'
import { FloatingErrorBanner } from './FloatingErrorBanner'

interface DashboardErrorZonesProps {
  children: React.ReactNode
}

export const DashboardErrorZones: React.FC<DashboardErrorZonesProps> = ({ children }) => {
  const { bannerErrors, overlayError } = useDashboardErrorZones()

  return (
    <>
      {bannerErrors.map((error) => (
        <FloatingErrorBanner key={error.errorId ?? error.kind} error={error} />
      ))}

      {overlayError ? <BlockingErrorOverlay error={overlayError} /> : children}
    </>
  )
}
