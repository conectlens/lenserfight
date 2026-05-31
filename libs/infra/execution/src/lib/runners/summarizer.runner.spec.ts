import { describe, it, expect, vi } from 'vitest'

import { SummarizerRunner } from './summarizer.runner'
import type { NodeRunnerContext } from './node-runner.interface'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'n1',
    upstreamOutputs: new Map(),
    resolvedParams: {},
    nodeConfig: {},
    executeProvider: vi.fn().mockResolvedValue({ mediaType: 'text', text: 'summary text here', metadata: {} }),
    ...overrides,
  }
}

const runner = new SummarizerRunner()

describe('SummarizerRunner', () => {
  it('throws when no text is available in inputs or config', async () => {
    const ctx = makeCtx()
    await expect(runner.execute(ctx)).rejects.toThrow(
      /no text found/i,
    )
  })

  it('returns summary with wordCount > 0 for valid text', async () => {
    const ctx = makeCtx({
      nodeConfig: { text: 'Hello world, this is a test.' },
    })
    const result = await runner.execute(ctx)
    expect(result.output.data?.['summary']).toBe('summary text here')
    expect(result.output.data?.['wordCount']).toBeGreaterThan(0)
  })

  it('calls executeProvider with capped text when input exceeds 20000 chars', async () => {
    const longText = 'w '.repeat(11_000) // 22000 chars
    const executeProvider = vi.fn().mockResolvedValue({ mediaType: 'text', text: 'truncated summary', metadata: {} })
    const ctx = makeCtx({
      nodeConfig: { text: longText },
      executeProvider,
    })
    await runner.execute(ctx)
    const calledPrompt = executeProvider.mock.calls[0][0].prompt as string
    // The prompt embeds the capped text — must not exceed MAX_INPUT_CHARS=20000 plus the system preamble.
    const textPortion = calledPrompt.split('\n\n')[1] ?? calledPrompt
    expect(textPortion.length).toBeLessThanOrEqual(20_000)
  })
})
