import { describe, it, expect, vi } from 'vitest'

import { LensExecuteRunner } from './lens-execute.runner'

import type { ExecutionInput, ExecutionResult } from '../execution.types'
import type { NodeRunnerContext } from './node-runner.interface'
import type { LensOutputContract } from '@lenserfight/types'

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId: 'node_lens_1',
    upstreamOutputs: new Map(),
    resolvedParams: { topic: 'AI workflows', tone: 'concise' },
    nodeConfig: { lensId: 'lens_abc', versionId: 'v_123' },
    ...overrides,
  }
}

const textResult: ExecutionResult = {
  mediaType: 'text',
  text: 'Generated blog post about AI workflows.',
  durationMs: 1200,
  metadata: { modelId: 'openai:gpt-4.1-mini', provider: 'openai' },
}

const imageResult: ExecutionResult = {
  mediaType: 'image',
  url: 'https://fal.media/output/abc123.png',
  mimeType: 'image/png',
  durationMs: 3400,
  metadata: { modelId: 'fal-ai:flux', provider: 'fal-ai' },
}

describe('LensExecuteRunner', () => {
  const runner = new LensExecuteRunner()

  it('has correct node type', () => {
    expect(runner.nodeType).toBe('lens_execute')
  })

  describe('happy path — text output', () => {
    it('calls provider and returns enriched result', async () => {
      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
        .mockResolvedValue({ ...textResult })

      const ctx = makeCtx({
        resolvedPrompt: 'Write a blog post about [[topic]] in [[tone]] style.',
        executeProvider,
      })

      const { output } = await runner.execute(ctx)

      expect(executeProvider).toHaveBeenCalledOnce()
      expect(output.mediaType).toBe('text')
      expect(output.text).toBe('Generated blog post about AI workflows.')
      expect(output.metadata?.lensId).toBe('lens_abc')
      expect(output.metadata?.versionId).toBe('v_123')
      expect(output.metadata?.executedBy).toBe('lens_execute_runner')
    })

    it('passes prompt and params to provider', async () => {
      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
        .mockResolvedValue({ ...textResult })

      const ctx = makeCtx({
        resolvedPrompt: 'Summarize this topic.',
        executeProvider,
        resolvedParams: { topic: 'LLMs', length: '500' },
      })

      await runner.execute(ctx)

      const input = executeProvider.mock.calls[0][0]
      expect(input.prompt).toBe('Summarize this topic.')
      expect(input.params).toEqual({ topic: 'LLMs', length: '500' })
    })
  })

  describe('happy path — image output', () => {
    it('returns media result with metadata', async () => {
      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
        .mockResolvedValue({ ...imageResult })

      const ctx = makeCtx({
        resolvedPrompt: 'Generate an abstract image of neural networks.',
        executeProvider,
        nodeConfig: { lensId: 'lens_img', versionId: 'v_img_1' },
      })

      const { output } = await runner.execute(ctx)

      expect(output.mediaType).toBe('image')
      expect(output.url).toBe('https://fal.media/output/abc123.png')
      expect(output.metadata?.lensId).toBe('lens_img')
    })
  })

  describe('fallback behavior', () => {
    it('returns empty text when resolvedPrompt is missing', async () => {
      const ctx = makeCtx({ resolvedPrompt: undefined, executeProvider: undefined })
      const { output } = await runner.execute(ctx)

      expect(output.mediaType).toBe('text')
      expect(output.text).toBe('')
      expect(output.data?.fallback).toBe(true)
    })

    it('returns rendered prompt as text when executeProvider is missing', async () => {
      const ctx = makeCtx({ resolvedPrompt: 'The prompt text', executeProvider: undefined })
      const { output } = await runner.execute(ctx)

      expect(output.text).toBe('The prompt text')
      expect(output.data?.fallback).toBe(true)
    })
  })

  describe('abort handling', () => {
    it('throws when signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
      const ctx = makeCtx({
        resolvedPrompt: 'test',
        executeProvider,
        signal: controller.signal,
      })

      await expect(runner.execute(ctx)).rejects.toThrow('Execution aborted')
      expect(executeProvider).not.toHaveBeenCalled()
    })
  })

  describe('output contract validation', () => {
    const contract: LensOutputContract = {
      kind: 'text',
      artifactKind: 'text',
      schema: {
        title: { type: 'string', required: true },
        summary: { type: 'string', required: true },
      },
    }

    it('adds contractWarnings when output mismatches contract', async () => {
      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
        .mockResolvedValue({
          mediaType: 'text',
          text: 'Some text',
          data: { title: 'A title' }, // missing 'summary'
          durationMs: 100,
        })

      const ctx = makeCtx({
        resolvedPrompt: 'generate',
        executeProvider,
        outputContract: contract,
      })

      const { output } = await runner.execute(ctx)

      expect(output.metadata?.contractWarnings).toBeDefined()
      expect(Array.isArray(output.metadata?.contractWarnings)).toBe(true)
      const warnings = output.metadata?.contractWarnings as Array<{ field: string }>
      expect(warnings.some((w) => w.field.includes('summary'))).toBe(true)
    })

    it('no warnings when output satisfies contract', async () => {
      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
        .mockResolvedValue({
          mediaType: 'text',
          text: 'output',
          data: { title: 'Blog Title', summary: 'A short summary' },
          durationMs: 200,
        })

      const ctx = makeCtx({
        resolvedPrompt: 'generate',
        executeProvider,
        outputContract: contract,
      })

      const { output } = await runner.execute(ctx)

      expect(output.metadata?.contractWarnings).toBeUndefined()
    })

    it('skips validation when no contract provided', async () => {
      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
        .mockResolvedValue({ ...textResult })

      const ctx = makeCtx({
        resolvedPrompt: 'test',
        executeProvider,
        outputContract: null,
      })

      const { output } = await runner.execute(ctx)

      expect(output.metadata?.contractWarnings).toBeUndefined()
    })
  })

  describe('attachment inference', () => {
    it('infers image attachments from resolved params containing URLs', async () => {
      const executeProvider = vi.fn<[ExecutionInput], Promise<ExecutionResult>>()
        .mockResolvedValue({ ...textResult })

      const ctx = makeCtx({
        resolvedPrompt: 'Analyze this image',
        executeProvider,
        resolvedParams: {
          image_url: 'https://example.com/photo.png',
          text_param: 'not a url',
        },
      })

      await runner.execute(ctx)

      const input = executeProvider.mock.calls[0][0]
      expect(input.attachments).toHaveLength(1)
      expect(input.attachments![0]).toEqual({ kind: 'image', url: 'https://example.com/photo.png' })
    })
  })
})
