import { useEffect } from 'react'
import { useAuth } from '@lenserfight/features/auth'
import { partnerProvisioningRepository } from '@lenserfight/data/repositories'

const REGISTERED_PARTNERS = ['chainabit'] as const

export function usePartnerProvisioning(): void {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    for (const partner of REGISTERED_PARTNERS) {
      partnerProvisioningRepository.provision(partner).catch(() => {
        // Non-critical: partner provisioning failures must never surface to users
      })
    }
  }, [user?.id])
}
