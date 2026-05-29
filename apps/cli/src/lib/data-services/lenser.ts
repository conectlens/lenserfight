/**
 * CLI data facade — mirrors `lenserService` / `lenserRepository` RPC contracts.
 * Commands and TUI must import from here (or sibling data-services modules),
 * not call PostgREST or Supabase clients directly.
 */
import { callRpc } from '../../utils/api'
import { extractProfileId } from '../lenser-catalog'

/** Active human lenser profile id for the signed-in user (`fn_lensers_get_active_profile`). */
export async function getActiveLenserProfileId(): Promise<string | null> {
  const profile = await callRpc<unknown>('fn_lensers_get_active_profile', {}, { requireAuth: true })
  return extractProfileId(profile)
}
