/**
 * CLI data facade — mirrors `lensesService.getPersonalFeed` / `lensesRepository`.
 */
import { callRpc } from '../../utils/api'

export type PersonalLensFeedRow = {
  id: string
  title: string
  description?: string | null
  personal_score?: number
  hot_score?: number
  primary_language?: string
  created_at?: string
}

/** Personalized lens feed (`fn_content_get_personal_lenses`). Auth user from JWT. */
export async function getPersonalFeed(
  offset = 0,
  limit = 20,
): Promise<PersonalLensFeedRow[]> {
  const rows = await callRpc<PersonalLensFeedRow[]>(
    'fn_content_get_personal_lenses',
    { p_limit: limit, p_offset: offset },
    { requireAuth: true },
  )
  return Array.isArray(rows) ? rows : []
}
