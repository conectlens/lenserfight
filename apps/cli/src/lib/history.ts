import { promises as fsp } from 'node:fs'
import path from 'node:path'

import { getDeviceConfigDir } from '@lenserfight/cli-client'

const MAX_HISTORY = 1000

function historyFilePath(): string {
  return path.join(getDeviceConfigDir(), 'cli-history.jsonl')
}

/** Most-recent-last, capped at MAX_HISTORY. Missing/unreadable file yields an empty history. */
export async function loadHistory(): Promise<string[]> {
  try {
    const raw = await fsp.readFile(historyFilePath(), 'utf-8')
    const lines = raw.split('\n').filter(Boolean)
    return lines.slice(-MAX_HISTORY)
  } catch {
    return []
  }
}

/** Best-effort append — a history-write failure must never interrupt the REPL. */
export async function appendHistory(entry: string): Promise<void> {
  const line = entry.replace(/\n/g, ' ').trim()
  if (!line) return
  try {
    await fsp.appendFile(historyFilePath(), line + '\n')
  } catch {
    // ignore
  }
}
