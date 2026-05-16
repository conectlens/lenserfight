import type { ChainabitConnectionState } from '@lenserfight/types'

import type { LocalKeyAvailabilityReason } from './useLocalKeyStore'

/**
 * Funding-source capability policy.
 *
 * GRASP — *Information Expert*: this module owns the answer to "is funding
 * source X actually usable right now?". The information lives in runtime
 * signals (gateway connectivity for Local Keys, Chainabit connection state,
 * cloud key inventory), not in build-time edition flags.
 *
 * Local-key access requires the LenserFight Gateway daemon to be running
 * (`lf gateway serve`) AND paired with this origin (`lf gateway pair --web`,
 * paste token in the UI). Until both conditions hold, `canUseLocalByok`
 * stays false and the UI surfaces a pairing flow instead of an add-key form.
 */

export interface FundingCapabilities {
  /** Gateway is reachable AND paired with this origin. */
  canUseLocalByok: boolean
  /** The user has at least one cloud-stored BYOK key to select. */
  canSelectCloudByok: boolean
  /** Chainabit funding is operationally usable right now. */
  canUseChainabit: boolean
  /** Chainabit was configured by the caller (used to decide whether to render the row at all). */
  isChainabitConfigured: boolean
  /** Why local keys aren't usable, if applicable. */
  localKeyReason: LocalKeyAvailabilityReason
  /** First human-readable reason no funding source is available (for empty states). */
  disabledReason: string | null
}

export interface UseFundingCapabilitiesArgs {
  availableCloudKeyCount: number
  chainabitState?: ChainabitConnectionState
  /** From `useLocalKeyStore().availability`. */
  localKeyAvailability: LocalKeyAvailabilityReason
}

export function useFundingCapabilities({
  availableCloudKeyCount,
  chainabitState,
  localKeyAvailability,
}: UseFundingCapabilitiesArgs): FundingCapabilities {
  const canUseLocalByok = localKeyAvailability === 'available'
  const canSelectCloudByok = availableCloudKeyCount > 0
  const canUseChainabit =
    chainabitState === 'connected' || chainabitState === 'no_credits'
  const isChainabitConfigured = chainabitState !== undefined

  let disabledReason: string | null = null
  if (!canUseLocalByok && !canSelectCloudByok && !canUseChainabit) {
    if (localKeyAvailability === 'gateway_unreachable') {
      disabledReason = 'Start the LenserFight Gateway (`lf gateway serve`) to use Local Keys.'
    } else if (localKeyAvailability === 'gateway_not_paired') {
      disabledReason = 'Pair the LenserFight Gateway (`lf gateway pair --web`) to use Local Keys.'
    } else {
      disabledReason = 'No funding source available. Add an API key or connect Chainabit.'
    }
  }

  return {
    canUseLocalByok,
    canSelectCloudByok,
    canUseChainabit,
    isChainabitConfigured,
    localKeyReason: localKeyAvailability,
    disabledReason,
  }
}
