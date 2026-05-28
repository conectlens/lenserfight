import type {
  AgentMemoryAccessLogRecord,
  AgentMemoryEntryRecord,
  MemoryProfileSummary,
  ReadMemoryEntriesInput,
  WriteMemoryEntryInput,
} from '@lenserfight/types'

import { createMemoryRepository } from '../factory'
import {
  type ListMemoryEntriesOptions,
} from '../repositories/memoryRepository'

const memoryRepo = createMemoryRepository()

export type { ListMemoryEntriesOptions }

export const memoryService = {
  listMemoryEntries: (
    profileId: string,
    options?: ListMemoryEntriesOptions
  ): Promise<AgentMemoryEntryRecord[]> =>
    memoryRepo.listMemoryEntries(profileId, options),

  readMemoryEntries: (
    input: ReadMemoryEntriesInput
  ): Promise<AgentMemoryEntryRecord[]> => memoryRepo.readMemoryEntries(input),

  writeMemoryEntry: (input: WriteMemoryEntryInput): Promise<string> =>
    memoryRepo.writeMemoryEntry(input),

  redactMemoryEntry: (memoryId: string, reason?: string): Promise<void> =>
    memoryRepo.redactMemoryEntry(memoryId, reason),

  summarizeMemoryProfile: (
    profileId: string
  ): Promise<MemoryProfileSummary> =>
    memoryRepo.summarizeMemoryProfile(profileId),

  listMemoryAccessLogs: (
    memoryId: string,
    limit?: number
  ): Promise<AgentMemoryAccessLogRecord[]> =>
    memoryRepo.listMemoryAccessLogs(memoryId, limit),
}
