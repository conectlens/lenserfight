// Batch 4 — BattleCreateRunner tests.
//
// Covers: happy path envelope emission, missing required fields, abort signal.

import { BattleCreateRunner } from './battle-create.runner'

import type { NodeRunnerContext } from '../node-runner.interface'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId:          'battle-create-node',
    upstreamOutputs: new Map(),
    resolvedParams:  {},
    nodeConfig: {
      title:          'AI Coding Battle',
      taskPrompt:     'Write a function that reverses a string.',
      battleType:     'ai_vs_ai',
      voterEligibility: 'open',
    },
    ...overrides,
  }
}

describe('BattleCreateRunner', () => {
  let runner: BattleCreateRunner

  beforeEach(() => {
    runner = new BattleCreateRunner()
  })

  it('has nodeType = battle_create', () => {
    expect(runner.nodeType).toBe('battle_create')
  })

  describe('happy path', () => {
    it('emits a __battle_create_request envelope with required fields', async () => {
      const result = await runner.execute(makeCtx())

      expect(result.output.data).toMatchObject({
        __battle_create_request: true,
        title:          'AI Coding Battle',
        taskPrompt:     'Write a function that reverses a string.',
        battleType:     'ai_vs_ai',
        voterEligibility: 'open',
        executedBy:     'battle_create_runner',
      })
      expect(result.output.text).toBe('AI Coding Battle')
    })

    it('includes optional workflowId and lensId when provided', async () => {
      const ctx = makeCtx({
        nodeConfig: {
          title:       'Workflow Battle',
          taskPrompt:  'Do the thing',
          battleType:  'ai_vs_ai',
          workflowId:  'wf-123',
          lensId:      'lens-456',
        },
      })

      const result = await runner.execute(ctx)

      expect(result.output.data).toMatchObject({
        workflowId: 'wf-123',
        lensId:     'lens-456',
      })
    })

    it('defaults voterEligibility to open when not specified', async () => {
      const ctx = makeCtx({
        nodeConfig: {
          title:      'Open Battle',
          taskPrompt: 'Task',
          battleType: 'ai_vs_ai',
        },
      })

      const result = await runner.execute(ctx)

      expect(result.output.data).toMatchObject({ voterEligibility: 'open' })
    })

    it('includes metadata with battleType', async () => {
      const result = await runner.execute(makeCtx())

      expect(result.output.metadata).toMatchObject({ battleType: 'ai_vs_ai', executedBy: 'battle_create_runner' })
    })
  })

  describe('missing required fields', () => {
    it('returns error when title is missing', async () => {
      const ctx = makeCtx({ nodeConfig: { taskPrompt: 'Task', battleType: 'ai_vs_ai' } })
      const result = await runner.execute(ctx)

      expect(result.output.data).toMatchObject({ error: expect.stringContaining('title') })
    })

    it('returns error when taskPrompt is missing', async () => {
      const ctx = makeCtx({ nodeConfig: { title: 'Battle', battleType: 'ai_vs_ai' } })
      const result = await runner.execute(ctx)

      expect(result.output.data).toMatchObject({ error: expect.stringContaining('taskPrompt') })
    })

    it('returns error when battleType is missing', async () => {
      const ctx = makeCtx({ nodeConfig: { title: 'Battle', taskPrompt: 'Task' } })
      const result = await runner.execute(ctx)

      expect(result.output.data).toMatchObject({ error: expect.stringContaining('battleType') })
    })

    it('lists all missing fields in the error message', async () => {
      const result = await runner.execute(makeCtx({ nodeConfig: {} }))

      const errorMsg = result.output.data?.['error'] as string
      expect(errorMsg).toContain('title')
      expect(errorMsg).toContain('taskPrompt')
      expect(errorMsg).toContain('battleType')
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
})
