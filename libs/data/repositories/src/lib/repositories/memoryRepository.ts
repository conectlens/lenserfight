import { supabase } from '@lenserfight/data/supabase'
import type {
  AgentMemoryAccessLogRecord,
  AgentMemoryEntryRecord,
  MemoryProfileSummary,
  MemoryScope,
  ReadMemoryEntriesInput,
  WriteMemoryEntryInput,
} from '@lenserfight/types'

export interface ListMemoryEntriesOptions {
  scope?: MemoryScope
  limit?: number
  includeRedacted?: boolean
}

export interface MemoryRepository {
  listMemoryEntries(
    profileId: string,
    options?: ListMemoryEntriesOptions
  ): Promise<AgentMemoryEntryRecord[]>
  readMemoryEntries(input: ReadMemoryEntriesInput): Promise<AgentMemoryEntryRecord[]>
  writeMemoryEntry(input: WriteMemoryEntryInput): Promise<string>
  redactMemoryEntry(memoryId: string, reason?: string): Promise<void>
  summarizeMemoryProfile(profileId: string): Promise<MemoryProfileSummary>
  listMemoryAccessLogs(memoryId: string, limit?: number): Promise<AgentMemoryAccessLogRecord[]>
}

export class SupabaseMemoryRepository implements MemoryRepository {
  async listMemoryEntries(
    profileId: string,
    options: ListMemoryEntriesOptions = {}
  ): Promise<AgentMemoryEntryRecord[]> {
    let query = supabase
      .schema('agents')
      .from('memories_v')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (options.scope) {
      query = query.eq('scope', options.scope)
    }
    if (!options.includeRedacted) {
      query = query.eq('is_redacted', false)
    }
    if (options.limit && options.limit > 0) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as AgentMemoryEntryRecord[]
  }

  async readMemoryEntries(input: ReadMemoryEntriesInput): Promise<AgentMemoryEntryRecord[]> {
    const { data, error } = await supabase.rpc('fn_read_memory_entries', {
      p_profile_id: input.profile_id,
      p_scope: input.scope ?? null,
      p_limit: input.limit ?? 10,
      p_team_run_id: input.team_run_id ?? null,
    })
    if (error) throw error
    return (data ?? []) as AgentMemoryEntryRecord[]
  }

  async writeMemoryEntry(input: WriteMemoryEntryInput): Promise<string> {
    const { data, error } = await supabase.rpc('fn_write_memory_entry', {
      p_profile_id: input.profile_id,
      p_scope: input.scope,
      p_source: input.source,
      p_content: input.content,
      p_confidence: input.confidence ?? 0.5,
      p_expires_at: input.expires_at ?? null,
      p_team_run_id: input.team_run_id ?? null,
      p_metadata: input.metadata ?? {},
    })
    if (error) throw error
    return data as string
  }

  async redactMemoryEntry(memoryId: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('fn_redact_memory_entry', {
      p_memory_id: memoryId,
      p_reason: reason ?? null,
    })
    if (error) throw error
  }

  async summarizeMemoryProfile(profileId: string): Promise<MemoryProfileSummary> {
    const { data, error } = await supabase.rpc('fn_summarize_memory_profile', {
      p_profile_id: profileId,
    })
    if (error) throw error
    return (data ?? {
      profile_id: profileId,
      count: 0,
      last_written_at: null,
      scopes: {},
    }) as MemoryProfileSummary
  }

  async listMemoryAccessLogs(
    memoryId: string,
    limit = 50
  ): Promise<AgentMemoryAccessLogRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('memory_access_logs')
      .select('*')
      .eq('memory_id', memoryId)
      .order('accessed_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as AgentMemoryAccessLogRecord[]
  }
}
