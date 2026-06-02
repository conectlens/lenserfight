// ─── Local Battle Engine ───────────────────────────────────────────────────────
// GRASP roles:
//   LocalBattleStore  — Pure Fabrication + Information Expert: owns disk persistence
//   LocalBattleLenser — Controller: receives "run battle" event, delegates to experts

import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import consola from 'consola'
import { byokKeyResolver, getStreamAdapter } from '@lenserfight/providers'
import type { ProviderMessage } from '@lenserfight/providers'
import { readBattleFile, writeBattleFile } from './local-battle-storage'
import { getLocalBattleStorageDirs } from './local-battle-paths'

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
  /** Who cast this vote. Absent on votes written before this field was added; treat as 'human'. */
  source?: 'human' | 'ai'
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

export class LocalBattleStore {
  private dir(root = process.cwd()): string {
    return getLocalBattleStorageDirs(root).primary
  }

  private legacyDir(root = process.cwd()): string {
    return getLocalBattleStorageDirs(root).legacy
  }

  private path(id: string, root?: string): string {
    return join(this.dir(root), `${id}.json`)
  }

  private legacyPath(id: string, root?: string): string {
    return join(this.legacyDir(root), `${id}.json`)
  }

  private ensureDir(root?: string): void {
    const d = this.dir(root)
    if (!existsSync(d)) mkdirSync(d, { recursive: true })
  }

  private findPath(id: string, root?: string): { path: string; legacy: boolean } | null {
    const primary = this.path(id, root)
    if (existsSync(primary)) return { path: primary, legacy: false }

    const legacy = this.legacyPath(id, root)
    if (existsSync(legacy)) return { path: legacy, legacy: true }

    return null
  }

  private migrateLegacyState(state: LocalBattleState, legacyPath: string): void {
    const target = this.path(state.id)
    if (target === legacyPath || existsSync(target)) return
    try {
      this.ensureDir()
      writeBattleFile(target, state)
      consola.warn(
        'Migrated local battle %s from project .lenserfight/ to user runtime storage. The legacy file remains at %s.',
        state.id.slice(0, 8),
        legacyPath
      )
    } catch (err) {
      consola.warn(
        'Could not migrate local battle %s to user runtime storage: %s',
        state.id.slice(0, 8),
        (err as Error).message
      )
    }
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
    const found = this.findPath(id)
    if (!found) throw new Error(`Local battle not found: ${id}`)
    const state = readBattleFile<LocalBattleState>(found.path)
    if (found.legacy) this.migrateLegacyState(state, found.path)
    return state
  }

  save(state: LocalBattleState): void {
    this.ensureDir()
    writeBattleFile(this.path(state.id), state)
  }

  list(): LocalBattleState[] {
    const byId = new Map<string, LocalBattleState>()

    for (const d of [this.legacyDir(), this.dir()]) {
      if (!existsSync(d)) continue
      for (const f of readdirSync(d).filter((name: string) => name.endsWith('.json'))) {
        try {
          const state = readBattleFile<LocalBattleState>(join(d, f))
          byId.set(state.id, state)
        } catch {
          // Skip corrupt or unreadable battle files so one bad legacy file does not break the dashboard.
        }
      }
    }

    return [...byId.values()]
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
    const { url: baseUrl, body, headers } = adapter.buildStreamRequest(cfg.model, messages, { maxTokens: 4096 })
    const authHeaders = adapter.authHeader(apiKey)
    const url = adapter.buildStreamUrl
      ? adapter.buildStreamUrl(cfg.model, apiKey)
      : baseUrl

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

// ─── LocalAiJudge ─────────────────────────────────────────────────────────────
// GRASP: Pure Fabrication — has no domain identity; exists solely to encapsulate
//   the AI judgment call so LocalBattleLenser stays focused on execution.
//
// Security contract:
//   - API keys are resolved transiently via byokKeyResolver; never stored in state.
//   - Contender outputs are wrapped in explicit XML delimiters so they cannot
//     override the judge's instruction block (structured-data injection defence).
//   - Rationale is capped at 1000 chars; winner is enum-validated before use.

const JUDGE_CANDIDATES = [
  { provider: 'anthropic', model: 'claude-haiku-4-5' },
  { provider: 'openai',    model: 'gpt-4o-mini' },
  { provider: 'ollama',    model: 'llama3.2' },
] as const

export interface LocalAiJudgeResult {
  winner: 'A' | 'B' | 'draw'
  rationale: string
  provider: string
  model: string
  tokensUsed: number
}

function buildJudgeUserPrompt(state: LocalBattleState): string {
  return `You are an impartial AI judge evaluating two AI outputs.

# Task
${state.task}

# Contender A Output
<contender_a>
${state.outputs.A || '(no output)'}
</contender_a>

# Contender B Output
<contender_b>
${state.outputs.B || '(no output)'}
</contender_b>

# Instructions
Evaluate both outputs objectively for quality, accuracy, completeness, and relevance to the task.
Return ONLY valid JSON — no markdown, no explanation outside the JSON object:
{"winner":"A","rationale":"one sentence reason"}
or {"winner":"B","rationale":"one sentence reason"}
or {"winner":"draw","rationale":"one sentence reason"}`
}

export class LocalAiJudge {
  /** Returns the first available judge provider/model, or null if none are available. */
  resolveJudgeProvider(): { provider: string; model: string } | null {
    for (const candidate of JUDGE_CANDIDATES) {
      if (byokKeyResolver.has(candidate.provider)) return candidate
    }
    return null
  }

  async judge(state: LocalBattleState): Promise<LocalAiJudgeResult> {
    const candidate = this.resolveJudgeProvider()
    if (!candidate) {
      throw new Error(
        'No provider key available for AI judge. ' +
        'Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or run Ollama locally.'
      )
    }

    const { provider, model } = candidate
    const apiKey = byokKeyResolver.resolve(provider)
    const adapter = getStreamAdapter(provider as Parameters<typeof getStreamAdapter>[0])
    const messages: ProviderMessage[] = [{ role: 'user', content: buildJudgeUserPrompt(state) }]
    const { url: baseUrl, body, headers } = adapter.buildStreamRequest(model, messages, { maxTokens: 512 })
    const authHeaders = adapter.authHeader(apiKey)
    const url = adapter.buildStreamUrl
      ? adapter.buildStreamUrl(model, apiKey)
      : baseUrl

    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, ...authHeaders },
      body,
    })

    if (!res.ok || !res.body) {
      const text = await res.text()
      // Never include apiKey in error messages
      throw new Error(`AI judge provider ${provider} error ${res.status}: ${text.slice(0, 400)}`)
    }

    let output = ''
    let tokensUsed = 0
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
        if (chunk?.content) { output += chunk.content; tokensUsed++ }
        if (chunk?.done) break
      }
    }

    // Extract the first JSON object from the response defensively
    const jsonMatch = output.match(/\{[^{}]*\}/)
    if (!jsonMatch) {
      throw new Error(`AI judge returned no parseable JSON. Response: ${output.slice(0, 200)}`)
    }

    let parsed: { winner?: unknown; rationale?: unknown }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error(`AI judge returned invalid JSON: ${jsonMatch[0].slice(0, 200)}`)
    }

    const winner = parsed.winner
    if (winner !== 'A' && winner !== 'B' && winner !== 'draw') {
      throw new Error(`AI judge returned unexpected winner: ${String(winner).slice(0, 50)}`)
    }

    return {
      winner,
      rationale: String(parsed.rationale ?? '').slice(0, 1000),
      provider,
      model,
      tokensUsed,
    }
  }
}

export const localAiJudge = new LocalAiJudge()
