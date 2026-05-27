import { useLenser } from '@lenserfight/features/profile/native'

export const useAuthenticatedLenser = () => {
  const { lenser, hasLenser, isLoading } = useLenser()
  return { lenser, hasLenser, isLoading }
}
