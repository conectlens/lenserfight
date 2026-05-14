import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@lenserfight/features/auth'
import { partnerProvisioningRepository } from '@lenserfight/data/repositories'
import { CHAINABIT_APP_URL } from '@lenserfight/utils/env'

const REGISTERED_PARTNERS = ['chainabit'] as const

function shouldRedirectToChainabit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('401') || msg.includes('Unauthenticated') || msg.includes('no account')
}

export function usePartnerProvisioning(): void {
  const { user } = useAuth()
  const userId = user?.id ?? null

  useQuery({
    queryKey: ['partner', 'provision', userId],
    queryFn: async () => {
      for (const partner of REGISTERED_PARTNERS) {
        try {
          await partnerProvisioningRepository.provision(partner)
        } catch (err: unknown) {
          if (shouldRedirectToChainabit(err)) {
            window.location.href = `${CHAINABIT_APP_URL}/sign-in?return_to=${encodeURIComponent(window.location.href)}`
            throw err
          }
          // Other failures are non-critical and must never surface to users.
        }
      }
      return true as const
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
