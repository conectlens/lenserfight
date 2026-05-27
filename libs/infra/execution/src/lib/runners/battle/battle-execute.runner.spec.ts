// Batch 2 — BattleExecuteRunner tests.
//
// Covers: missing battleId, both slots complete, one slot missing metadata.

import { BattleExecuteRunner } from './battle-execute.runner'

import type { ExecutionResult } from '../../execution.types'
import type { NodeRunnerContext } from '../node-runner.interface'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId:           'battle-exec-node',
    upstreamOutputs:  new Map(),
    resolvedParams:   {},
    nodeConfig:       { battleId: 'battle-xyz' },
    ...overrides,
  }
}

function makeContenderOutput(slot: 'A' | 'B', text: string): ExecutionResult {
  return {
    mediaType: 'text',
    text,
    metadata: { slot, battleId: 'battle-xyz', executedBy: 'contender_run_runner' },
  }
}

describe('BattleExecuteRunner', () => {
  let runner: BattleExecuteRunner

  beforeEach(() => {
    runner = new BattleExecuteRunner()
  })

  it('has nodeType = battle_execute', () => {
    expect(runner.nodeType).toBe('battle_execute')
  })

  describe('missing battleId', () => {
    it('returns an error output without throwing', async () => {
      const ctx = makeCtx({ nodeConfig: {} })

      const result = await runner.execute(ctx)

      expect(result.output.data).toMatchObject({ error: expect.stringContaining('battleId') })
      expect(result.output.text).toBe('')
    })
  })

  describe('with upstream contender outputs', () => {
    it('collects slot A and slot B results from upstreamOutputs', async () => {
      const upstreamOutputs = new Map<string, ExecutionResult>([
        ['node-a', makeContenderOutput('A', 'Contender A response')],
        ['node-b', makeContenderOutput('B', 'Contender B response')],
      ])
      const ctx = makeCtx({ upstreamOutputs })

      const result = await runner.execute(ctx)

      expect(result.output.data).toMatchObject({
        battleId:      'battle-xyz',
        executionMode: 'dag_orchestrated',
        upstreamCount: 2,
      })
      const contenderResults = result.output.data?.['contenderResults'] as Record<string, unknown>
      expect(contenderResults['slot_A']).toBeDefined()
      expect(contenderResults['slot_B']).toBeDefined()
    })

    it('skips upstream nodes without slot metadata', async () => {
      const upstreamOutputs = new Map<string, ExecutionResult>([
        ['node-a', makeContenderOutput('A', 'Has slot')],
        ['node-x', { mediaType: 'text', text: 'No slot metadata' }], // no slot in metadata
      ])
      const ctx = makeCtx({ upstreamOutputs })

      const result = await runner.execute(ctx)

      const contenderResults = result.output.data?.['contenderResults'] as Record<string, unknown>
      expect(Object.keys(contenderResults)).toHaveLength(1)
      expect(contenderResults['slot_A']).toBeDefined()
    })
  })

  describe('abort signal', () => {
    it('throws when signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()
      const ctx = makeCtx({ signal: controller.signal })

      await expect(runner.execute(ctx)).rejects.toThrow('Execution aborted')
    })
  })

  describe('metadata', () => {
    it('includes battleId in output metadata for downstream nodes', async () => {
      const ctx = makeCtx()

      const result = await runner.execute(ctx)

      expect(result.output.metadata).toMatchObject({ battleId: 'battle-xyz' })
    })
  })
})
