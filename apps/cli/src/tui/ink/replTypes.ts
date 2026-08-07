import type { TranscriptLine } from '../stream-capture'

export type { TranscriptLine }

export type EntryKind = 'command' | 'shell' | 'meta' | 'system'
export type EntryStatus = 'running' | 'done' | 'error' | 'cancelled'

export interface TranscriptEntry {
  id: string
  kind: EntryKind
  /** What's echoed above the output, e.g. "lf agents list" or "!ls -la". */
  displayCommand: string
  /** Present for 'command'/'shell' entries — lets a failed/cancelled entry be retried. */
  argv?: string[]
  lines: TranscriptLine[]
  status: EntryStatus
  exitCode?: number
  errorSummary?: string
  /** Only populated when debug mode was on at finalize time — Ink's <Static> commits are immutable once flushed, so this can't be toggled after the fact on a past entry. */
  errorDetail?: string
  startedAt: number
  finishedAt?: number
}
