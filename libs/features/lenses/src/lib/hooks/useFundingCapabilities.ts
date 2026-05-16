import { useEffect, useState } from 'react'

import type { ChainabitConnectionState } from '@lenserfight/types'

/**
 * Funding-source capability policy.
 *
 * GRASP — *Information Expert*: this module owns the answer to
 * "is funding source X actually usable right now?". The information lives in
 * runtime signals (storage availability, Chainabit connection state, key
 * inventory), not in build-time edition flags. Components should consume the
 * capability flags exposed here instead of re-deriving policy in JSX.
 *
 * Local-key encryption uses @noble/ciphers (userland AES-GCM), so it works in
 * any browser context — secure or otherwise. The only runtime requirement for
 * Local Keys is access to IndexedDB; private-browsing modes that strip it
 * surface a `canUseLocalByok = false` result.
 */

const isBrowser = typeof window !== 'undefined'

function detectIndexedDbAvailable(): boolean {
  if (!isBrowser) return false
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

export interface FundingCapabilities {
  /** Browser exposes IndexedDB; encryption itself is provided by @noble/ciphers. */
  canUseLocalByok: boolean
  /** The user has at least one cloud-stored BYOK key to select. */
  canSelectCloudByok: boolean
  /** Chainabit funding is operationally usable right now. */
  canUseChainabit: boolean
  /** Chainabit was configured by the caller (used to decide whether to render the row at all). */
  isChainabitConfigured: boolean
  /** First human-readable reason no funding source is available (for empty states). */
  disabledReason: string | null
}

export interface UseFundingCapabilitiesArgs {
  availableCloudKeyCount: number
  chainabitState?: ChainabitConnectionState
}

export function useFundingCapabilities({
  availableCloudKeyCount,
  chainabitState,
}: UseFundingCapabilitiesArgs): FundingCapabilities {
  const [indexedDbAvailable, setIndexedDbAvailable] = useState<boolean>(detectIndexedDbAvailable)

  useEffect(() => {
    setIndexedDbAvailable(detectIndexedDbAvailable())
  }, [])

  const canUseLocalByok = indexedDbAvailable
  const canSelectCloudByok = availableCloudKeyCount > 0
  const canUseChainabit =
    chainabitState === 'connected' || chainabitState === 'no_credits'
  const isChainabitConfigured = chainabitState !== undefined

  let disabledReason: string | null = null
  if (!canUseLocalByok && !canSelectCloudByok && !canUseChainabit) {
    disabledReason = !indexedDbAvailable
      ? 'Local keys require IndexedDB (disabled in private browsing).'
      : 'No funding source available. Add an API key or connect Chainabit.'
  }

  return {
    canUseLocalByok,
    canSelectCloudByok,
    canUseChainabit,
    isChainabitConfigured,
    disabledReason,
  }
}
