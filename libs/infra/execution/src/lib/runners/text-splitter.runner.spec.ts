import { describe, it, expect } from 'vitest'

import { TextSplitterRunner } from './text-splitter.runner'
import type { NodeRunnerContext } from './node-runner.interface'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'n1',
    upstreamOutputs: new Map(),
    resolvedParams: {},
    nodeConfig: {},
    ...overrides,
  }
}

const runner = new TextSplitterRunner()

describe('TextSplitterRunner', () => {
  it('separator split: splits on \\n\\n into correct chunks', async () => {
    const ctx = makeCtx({
      nodeConfig: { splitBy: 'separator', separator: '\n\n' },
      resolvedParams: { text: 'a\n\nb\n\nc' },
    })
    const result = await runner.execute(ctx)
    expect(result.output.data?.['chunks']).toEqual(['a', 'b', 'c'])
    expect(result.output.data?.['count']).toBe(3)
  })

  it('character split: produces correctly sized chunks with no overlap', async () => {
    const ctx = makeCtx({
      nodeConfig: { splitBy: 'characters', chunkSize: 3, overlap: 0 },
      resolvedParams: { text: 'abcdefgh' },
    })
    const result = await runner.execute(ctx)
    const chunks = result.output.data?.['chunks'] as string[]
    expect(chunks).toContain('abc')
    expect(chunks).toContain('def')
    expect(chunks).toContain('gh')
  })

  it('input over 10000 chars is capped (does not throw) and output is bounded', async () => {
    const longText = 'x'.repeat(10_001)
    const ctx = makeCtx({
      nodeConfig: { splitBy: 'separator', separator: '\n\n' },
      resolvedParams: { text: longText },
    })
    // Implementation slices to MAX_INPUT_CHARS=10000 without throwing.
    const result = await runner.execute(ctx)
    // The capped text has no separator so it yields one chunk of 10000 chars.
    const chunks = result.output.data?.['chunks'] as string[]
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    expect(chunks[0].length).toBeLessThanOrEqual(10_000)
  })

  it('empty string input yields empty chunks array', async () => {
    const ctx = makeCtx({
      nodeConfig: { splitBy: 'separator', separator: '\n\n' },
      resolvedParams: { text: '' },
    })
    const result = await runner.execute(ctx)
    expect(result.output.data?.['chunks']).toEqual([])
    expect(result.output.data?.['count']).toBe(0)
  })
})
