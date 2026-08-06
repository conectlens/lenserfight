import { callRpc } from '@lenserfight/cli-client'

export interface MemoryProfileRow {
  id: string
  name: string
  scope_type: string
  isolation_mode: string
  retention_days: number
  is_default: boolean
}

export interface MemoryEntryRow {
  id: string
  scope: string
  source: string
  content: string
  confidence: number
  created_at: string
  is_redacted?: boolean
}

export interface MemorySearchRow extends MemoryEntryRow {
  profile_id: string
  ai_lenser_id: string
  rank: number
}

/** Read-only mirror of commands/memory.ts's list/search RPC calls. */
export async function listMemoryProfiles(aiLenserId: string): Promise<MemoryProfileRow[]> {
  const rows = await callRpc<MemoryProfileRow[]>(
    'fn_get_agent_memory_profiles',
    { p_ai_lenser_id: aiLenserId },
    { requireAuth: true },
  )
  return rows ?? []
}

export async function readMemoryEntries(profileId: string, scope?: string, limit = 20): Promise<MemoryEntryRow[]> {
  const rows = await callRpc<MemoryEntryRow[]>(
    'fn_read_memory_entries',
    { p_profile_id: profileId, p_scope: scope || null, p_limit: limit, p_team_run_id: null },
    { requireAuth: true },
  )
  return rows ?? []
}

export async function searchMemoryEntries(query: string, profileId?: string, limit = 20): Promise<MemorySearchRow[]> {
  const rows = await callRpc<MemorySearchRow[]>(
    'fn_search_memory_entries',
    { p_query: query, p_profile_id: profileId || null, p_limit: limit },
    { requireAuth: true },
  )
  return rows ?? []
}
