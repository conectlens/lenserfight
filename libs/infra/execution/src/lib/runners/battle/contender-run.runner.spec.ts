// Batch 2 — ContenderRunRunner tests.
//
// Covers: happy path, fallback (no provider), abort signal, provider throws,
// personality note passed in params, battle metadata in output.

import { ContenderRunRunner } from './contender-run.runner'
import type { NodeRunnerContext } from '../node-runner.interface'
import type { ExecutionResult } from '../../execution.types'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId:           'test-node-1',
    upstreamOutputs:  new Map(),
    resolvedParams:   {},
    nodeConfig:       {
      battleId:    'battle-abc',
      contenderId: 'contender-abc',
      slot:        'A',
    },
    ...overrides,
  }
}

const MOCK_RESULT: ExecutionResult = {
  mediaType: 'text',
  text:      'Generated text from provider',
  durationMs: 100,
}

describe('ContenderRunRunner', () => {
  let runner: ContenderRunRunner

  beforeEach(() => {
    runner = new ContenderRunRunner()
  })

  it('has nodeType = contender_run', () => {
    expect(runner.nodeType).toBe('contender_run')
  })

  describe('happy path', () => {
    it('calls executeProvider with the resolved prompt and returns text output', async () => {
      const executeProvider = jest.fn<Promise<ExecutionResult>, [unknown]>().mockResolvedValue(MOCK_RESULT)
      const ctx = makeCtx({ resolvedPrompt: 'Write a haiku', executeProvider })

      const result = await runner.execute(ctx)

      expect(executeProvider).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Write a haiku' }),
      )
      expect(result.output.text).toBe('Generated text from provider')
      expect(result.output.mediaType).toBe('text')
    })

    it('attaches battle metadata to result.metadata', async () => {
      const executeProvider = jest.fn().mockResolvedValue({ ...MOCK_RESULT, metadata: {} })
      const ctx = makeCtx({ resolvedPrompt: 'prompt', executeProvider })

      const result = await runner.execute(ctx)

      expect(result.output.metadata).toMatchObject({
        battleId:    'battle-abc',
        contenderId: 'contender-abc',
        slot:        'A',
        executedBy:  'contender_run_runner',
      })
    })

    it('merges personality note into params as __system_prompt', async () => {
      const executeProvider = jest.fn().mockResolvedValue(MOCK_RESULT)
      const ctx = makeCtx({
        resolvedPrompt: 'Do the task',
        executeProvider,
        nodeConfig: {
          battleId:        'b1',
          contenderId:     'c1',
          slot:            'B',
          personalityNote: 'You are a pirate.',
        },
      })

      await runner.execute(ctx)

      expect(executeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ __system_prompt: 'You are a pirate.' }),
        }),
      )
    })
  })

  describe('fallback (no provider)', () => {
    it('returns the resolved prompt as text when executeProvider is absent', async () => {
      const ctx = makeCtx({ resolvedPrompt: 'Echo this' })

      const result = await runner.execute(ctx)

      expect(result.output.text).toBe('Echo this')
      expect(result.output.data).toMatchObject({ fallback: true, slot: 'A' })
    })

    it('returns empty text when resolvedPrompt is also absent', async () => {
      const ctx = makeCtx()

      const result = await runner.execute(ctx)

      expect(result.output.text).toBe('')
      expect(result.output.data).toMatchObject({ fallback: true })
    })
  })

  describe('abort signal', () => {
    it('throws when signal is already aborted before provider call', async () => {
      const controller = new AbortController()
      controller.abort()
      const executeProvider = jest.fn().mockResolvedValue(MOCK_RESULT)
      const ctx = makeCtx({
        resolvedPrompt: 'prompt',
        executeProvider,
        signal: controller.signal,
      })

      await expect(runner.execute(ctx)).rejects.toThrow('Execution aborted')
      expect(executeProvider).not.toHaveBeenCalled()
    })
  })

  describe('provider throws', () => {
    it('propagates provider errors for engine retry handling', async () => {
      const executeProvider = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'))
      const ctx = makeCtx({ resolvedPrompt: 'prompt', executeProvider })

      await expect(runner.execute(ctx)).rejects.toThrow('Rate limit exceeded')
    })
  })
})
