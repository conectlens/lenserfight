import { useSearchParams } from 'react-router-dom'

/**
 * GRASP: Controller + Information Expert + Pure Fabrication
 *
 * Reads and validates the `?status=` query param after a LemonSqueezy
 * checkout redirect. Acts as the sole responsible party for translating
 * the URL signal into a typed domain value consumed by StorePage.
 *
 * Protected Variations: unknown values collapse to `null`, keeping the
 * caller safe from unexpected URL tampering.
 */
export type CheckoutStatus = 'success' | 'error' | null

export function useCheckoutStatus(): CheckoutStatus {
  const [params] = useSearchParams()
  const raw = params.get('status')

  if (raw === 'success') return 'success'
  if (raw === 'error') return 'error'
  return null
}
