// eslint-disable-next-line @nx/enforce-module-boundaries
import { useLenser } from '@lenserfight/features/profile/useLenser'

export const useAuthenticatedLenser = () => {
  const { lenser, hasLenser, isLoading } = useLenser()
  return { lenser, hasLenser, isLoading }
}
