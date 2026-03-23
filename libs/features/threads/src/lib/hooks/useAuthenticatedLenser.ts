import { useLenser } from '@lenserfight/features/profile'

export const useAuthenticatedLenser = () => {
  const { lenser, hasLenser, isLoading } = useLenser()
  return { lenser, hasLenser, isLoading }
}
