import { usePartnerConnection, type UsePartnerConnectionResult } from './usePartnerConnection'

/** @deprecated Use PartnerConnectionState from @lenserfight/types */
export type ChainabitConnectionState = UsePartnerConnectionResult['state']

/** @deprecated Use UsePartnerConnectionResult */
export type UseChainabitConnectionResult = UsePartnerConnectionResult

export function useChainabitConnection(): UsePartnerConnectionResult {
  return usePartnerConnection('chainabit')
}
