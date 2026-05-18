
import { createChainabitAdapter, type ChainabitAdapterCtx } from './chainabitAdapter'
import { createCloudByokAdapter, type CloudByokAdapterCtx } from './cloudByokAdapter'
import { createLocalByokAdapter, type LocalByokAdapterCtx } from './localByokAdapter'
import { FundingAdapterError, type FundingAdapter } from './types'

import type { FundingSource } from '@lenserfight/types'

export * from './types'
export { createLocalByokAdapter, createCloudByokAdapter, createChainabitAdapter }

export interface AdapterContext {
  local?: LocalByokAdapterCtx
  cloud?: CloudByokAdapterCtx
  chainabit?: ChainabitAdapterCtx
}

/**
 * Resolve the adapter for a given funding source.
 *
 * Each branch only requires the context relevant to its transport, so a caller
 * that never uses Local Keys does not have to wire `resolveLocalKey`.
 */
export function selectFundingAdapter(source: FundingSource, ctx: AdapterContext): FundingAdapter {
  switch (source) {
    case 'user_byok_local':
      if (!ctx.local) {
        throw new FundingAdapterError(
          'Local BYOK adapter requires resolveLocalKey + localKeyId context.',
          source,
          'misconfigured',
        )
      }
      return createLocalByokAdapter(ctx.local)
    case 'user_byok_cloud':
      return createCloudByokAdapter(ctx.cloud ?? { keyRefId: null })
    case 'platform_credit':
      return createChainabitAdapter(ctx.chainabit ?? {})
    default:
      throw new FundingAdapterError(
        `Unsupported funding source: ${source as string}`,
        source,
        'unsupported',
      )
  }
}
