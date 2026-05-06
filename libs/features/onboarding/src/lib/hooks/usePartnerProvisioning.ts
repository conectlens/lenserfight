import { useEffect } from 'react'
import { useAuth } from '@lenserfight/features/auth'
import { partnerProvisioningRepository } from '@lenserfight/data/repositories'
import { CHAINABIT_APP_URL } from '@lenserfight/utils/env'

const REGISTERED_PARTNERS = ['chainabit'] as const

export function usePartnerProvisioning(): void {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    for (const partner of REGISTERED_PARTNERS) {
      partnerProvisioningRepository.provision(partner).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('401') || msg.includes('Unauthenticated') || msg.includes('no account')) {
          window.location.href = `${CHAINABIT_APP_URL}/sign-in?return_to=${encodeURIComponent(window.location.href)}`
        }
        // Other failures are non-critical and must never surface to users
      })
    }
  }, [user?.id])
}
