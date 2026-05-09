// ─── Local Battle Engine ───────────────────────────────────────────────────────
// GRASP roles:
//   LocalBattleStore  — Pure Fabrication + Information Expert: owns disk persistence
//   LocalBattleLenser — Controller: receives "run battle" event, delegates to experts

import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { byokKeyResolver, getStreamAdapter } from '@lenserfight/providers'
import type { ProviderMessage } from '@lenserfight/providers'
import { readBattleFile, writeBattleFile } from './local-battle-storage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalContenderConfig {
  slot: 'A' | 'B'
  label: string
  provider: string
  model: string
  /** Optional env var override; falls back to BYOKKeyResolver default */
  keyVar?: string
}

export interface LocalVote {
  slot: 'A' | 'B' | 'draw'
  rationale?: string
  votedAt: string
}

export interface LocalBattleState {
  id: string
  name: string
  task: string
  status: 'draft' | 'ready' | 'executed' | 'voted'
  contenders: LocalContenderConfig[]
  outputs: { A: string; B: string }
  votes: LocalVote[]
  createdAt: string
  executedAt?: string
}

// ─── LocalBattleStore ─────────────────────────────────────────────────────────

const BATTLES_DIR = '.lenserfight/local-battles'

export class LocalBattleStore {
  private dir(root = process.cwd()): string {
    return resolve(root, BATTLES_DIR)
  }

  private path(id: string, root?: string): string {
    return join(this.dir(root), `${id}.json`)
  }

  private ensureDir(root?: string): void {
    const d = this.dir(root)
    if (!existsSync(d)) mkdirSync(d, { recursive: true })
  }

  create(name: string, task: string): LocalBattleState {
    const state: LocalBattleState = {
      id: randomUUID(),
      name,
      task,
      status: 'draft',
      contenders: [],
      outputs: { A: '', B: '' },
      votes: [],
      createdAt: new Date().toISOString(),
    }
    this.save(state)
    return state
  }

  load(id: string): LocalBattleState {
    const file = this.path(id)
    if (!existsSync(file)) throw new Error(`Local battle not found: ${id}`)
    return readBattleFile<LocalBattleState>(file)
  }

  save(state: LocalBattleState): void {
    this.ensureDir()
    writeBattleFile(this.path(state.id), state)
  }

  list(): LocalBattleState[] {
    const d = this.dir()
    if (!existsSync(d)) return []
    const { readdirSync } = require('node:fs') as typeof import('node:fs')
    return readdirSync(d)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => readBattleFile<LocalBattleState>(join(d, f)))
      .sort((a: LocalBattleState, b: LocalBattleState) => b.createdAt.localeCompare(a.createdAt))
  }

  addContender(id: string, cfg: LocalContenderConfig): LocalBattleState {
    const state = this.load(id)
    state.contenders = state.contenders.filter((c) => c.slot !== cfg.slot)
    state.contenders.push(cfg)
    const hasA = state.contenders.some((c) => c.slot === 'A')
    const hasB = state.contenders.some((c) => c.slot === 'B')
    state.status = hasA && hasB ? 'ready' : 'draft'
    this.save(state)
    return state
  }

  recordVote(id: string, vote: LocalVote): LocalBattleState {
    const state = this.load(id)
    state.votes.push(vote)
    if (state.status === 'executed') state.status = 'voted'
    this.save(state)
    return state
  }

  markExecuted(id: string, outputs: { A: string; B: string }): LocalBattleState {
    const state = this.load(id)
    state.outputs = outputs
    state.status = 'executed'
    state.executedAt = new Date().toISOString()
    this.save(state)
    return state
  }

  /** Resolve a state by UUID prefix or full UUID */
  resolve(idOrPrefix: string): LocalBattleState {
    const all = this.list()
    const match = all.find(
      (s) => s.id === idOrPrefix || s.id.startsWith(idOrPrefix)
    )
    if (!match) throw new Error(`Local battle not found: ${idOrPrefix}`)
    return match
  }
}

export const localBattleStore = new LocalBattleStore()

// ─── LocalBattleLenser ────────────────────────────────────────────────────────

export interface RunTokenCallback {
  (slot: 'A' | 'B', delta: string): void
}

export interface RunResult {
  A: string
  B: string
  tokensA: number
  tokensB: number
  durationMs: number
}

export class LocalBattleLenser {
  async run(
    state: LocalBattleState,
    onToken: RunTokenCallback,
    signal?: AbortSignal
  ): Promise<RunResult> {
    const a = state.contenders.find((c) => c.slot === 'A')
    const b = state.contenders.find((c) => c.slot === 'B')
    if (!a || !b) throw new Error('Both contenders (A and B) must be configured before running.')

    const messages: ProviderMessage[] = [{ role: 'user', content: state.task }]
    const startedAt = Date.now()

    const [resultA, resultB] = await Promise.all([
      this.streamContender(a, messages, (d) => onToken('A', d), signal),
      this.streamContender(b, messages, (d) => onToken('B', d), signal),
    ])

    return {
      A: resultA.output,
      B: resultB.output,
      tokensA: resultA.tokens,
      tokensB: resultB.tokens,
      durationMs: Date.now() - startedAt,
    }
  }

  private async streamContender(
    cfg: LocalContenderConfig,
    messages: ProviderMessage[],
    onToken: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<{ output: string; tokens: number }> {
    const apiKey = byokKeyResolver.resolve(cfg.provider, { envVar: cfg.keyVar })
    const adapter = getStreamAdapter(cfg.provider as Parameters<typeof getStreamAdapter>[0])
    const { url, body, headers } = adapter.buildStreamRequest(cfg.model, messages, { maxTokens: 4096 })
    const authHeaders = adapter.authHeader(apiKey)

    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, ...authHeaders },
      body,
      signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text()
      throw new Error(`[${cfg.slot}] Provider ${cfg.provider} error ${res.status}: ${text}`)
    }

    let output = ''
    let tokens = 0
    let eventType: string | undefined
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); continue }
        if (!line.startsWith('data: ') && !line.trim()) continue
        const chunk = adapter.parseStreamChunk(line, eventType)
        if (chunk?.content) {
          output += chunk.content
          tokens++
          onToken(chunk.content)
        }
        if (chunk?.done) break
      }
    }

    return { output, tokens }
  }
}

export const localBattleLenser = new LocalBattleLenser()
