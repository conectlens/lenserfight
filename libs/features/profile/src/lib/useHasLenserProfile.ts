import { useLenser } from './context/LenserContext'

/**
 * GRASP Information Expert: LenserContext owns the profile state,
 * so this hook delegates to it. Consumers get a focused, stable interface
 * for the single question "does this user have a lenser profile?".
 */
export const useHasLenserProfile = () => {
  const { hasLenser, isLoading } = useLenser()
  return { hasLenser, isLoading }
}
