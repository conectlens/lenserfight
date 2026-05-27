// Multimodal workflow chain tests — validates cross-modality execution
// (text→image→text) and hybrid local/cloud provider routing through the engine.
import { describe, it, expect, vi } from 'vitest'

import { WorkflowExecutionService } from './workflow-execution.service'

import type { IExecutionProvider, ExecutionInput, ExecutionResult } from './execution.types'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
} from './workflow-execution.service'

// ── Provider factories ───────────────────────────────────────────────────────

function textProvider(id = 'text-provider'): IExecutionProvider {
  return {
    id,
    supportedMediaTypes: ['text'],
    async execute(_model: string, input: ExecutionInput): Promise<ExecutionResult> {
      return { mediaType: 'text', text: `generated:${input.prompt}`, metadata: {} }
    },
  }
}

function imageProvider(id = 'image-provider'): IExecutionProvider {
  return {
    id,
    supportedMediaTypes: ['image'],
    async execute(_model: string, input: ExecutionInput): Promise<ExecutionResult> {
      return {
        mediaType: 'image',
        text: `image_url:${input.prompt.slice(0, 20)}`,
        metadata: { width: 1024, height: 1024 },
      }
    },
  }
}

function hybridProvider(): IExecutionProvider {
  return {
    id: 'hybrid',
    supportedMediaTypes: ['text', 'image'],
    async execute(_model: string, input: ExecutionInput): Promise<ExecutionResult> {
      return { mediaType: 'text', text: input.prompt, metadata: {} }
    },
  }
}

function failingProvider(id = 'fail'): IExecutionProvider {
  return {
    id,
    supportedMediaTypes: ['text', 'image'],
    async execute(): Promise<ExecutionResult> {
      throw new Error('provider_unreachable')
    },
  }
}

// ── Context & helpers ────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<WorkflowExecutionContext> = {}): WorkflowExecutionContext {
  return {
    runId: 'run-multimodal',
    rootInputs: { input: 'start' },
    async resolveLensTemplate() {
      return '[[input]]'
    },
    async onNodeStatusChange() {},
    ...overrides,
  }
}

function n(id: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return { id, lensId: 'test-lens', ...overrides }
}

function e(
  source: string,
  target: string,
  overrides: Partial<WorkflowEdge> = {},
): WorkflowEdge {
  return {
    sourceNodeId: source,
    targetNodeId: target,
    sourceOutputKey: 'text',
    targetParamLabel: 'input',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WorkflowExecutionService — multimodal chains', () => {
  describe('text → image → text chain', () => {
    it('completes 3-node multimodal chain', async () => {
      const service = new WorkflowExecutionService(hybridProvider())
      const ctx = makeCtx()

      const result = await service.executeWorkflow(
        [n('text-gen'), n('img-gen'), n('caption')],
        [e('text-gen', 'img-gen'), e('img-gen', 'caption')],
        ctx,
      )

      expect(result.status).toBe('completed')
      expect(result.nodeResults).toHaveLength(3)
      expect(result.nodeResults.every((r) => r.status === 'completed')).toBe(true)
    })

    it('passes output from text node to image node as input', async () => {
      const executionLog: { nodeId: string; prompt: string }[] = []
      const provider: IExecutionProvider = {
        id: 'tracking',
        supportedMediaTypes: ['text', 'image'],
        async execute(_m, input): Promise<ExecutionResult> {
          executionLog.push({ nodeId: 'tracked', prompt: input.prompt })
          return { mediaType: 'text', text: `out:${input.prompt}`, metadata: {} }
        },
      }

      const service = new WorkflowExecutionService(provider)
      const ctx = makeCtx({ rootInputs: { input: 'cat photo' } })

      await service.executeWorkflow(
        [n('A'), n('B')],
        [e('A', 'B')],
        ctx,
      )

      // Node B should receive the output of node A as its input
      expect(executionLog.length).toBe(2)
      expect(executionLog[1].prompt).toContain('cat photo')
    })
  })

  describe('per-node provider resolution', () => {
    it('uses resolveExecutionProvider to route different nodes to different providers', async () => {
      const localProvider = textProvider('ollama-local')
      const cloudProvider = textProvider('openai-cloud')

      const perNodeProvider = vi.fn(async (nodeId: string) => {
        return nodeId === 'local-node' ? localProvider : cloudProvider
      })

      const service = new WorkflowExecutionService(cloudProvider)
      const ctx = makeCtx({
        resolveExecutionProvider: perNodeProvider,
      })

      const result = await service.executeWorkflow(
        [n('local-node'), n('cloud-node')],
        [e('local-node', 'cloud-node')],
        ctx,
      )

      expect(result.status).toBe('completed')
      // resolveExecutionProvider receives the full node object
      expect(perNodeProvider).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'local-node' }),
      )
    })
  })

  describe('provider failure isolation', () => {
    it('local provider failure does not prevent cloud node execution with skip policy', async () => {
      const calls: string[] = []
      const mixedProvider: IExecutionProvider = {
        id: 'mixed',
        supportedMediaTypes: ['text'],
        async execute(_m, input): Promise<ExecutionResult> {
          calls.push(input.prompt)
          if (input.prompt === 'start') throw new Error('local_failure')
          return { mediaType: 'text', text: 'ok', metadata: {} }
        },
      }

      const service = new WorkflowExecutionService(mixedProvider)
      const ctx = makeCtx({ rootInputs: { input: 'start' } })

      const result = await service.executeWorkflow(
        [
          n('local', { config: {} } as any),
          n('cloud', { config: { onParentFailure: 'skip' } } as any),
        ],
        [e('local', 'cloud')],
        ctx,
      )

      // Local fails, cloud is skipped via onParentFailure policy
      const localResult = result.nodeResults.find((r) => r.nodeId === 'local')
      expect(localResult?.status).toBe('failed')
      const cloudResult = result.nodeResults.find((r) => r.nodeId === 'cloud')
      expect(cloudResult?.status).toBe('skipped')
    })
  })

  describe('mixed media outputs', () => {
    it('handles image URL output passed as text input to downstream node', async () => {
      const provider: IExecutionProvider = {
        id: 'media-chain',
        supportedMediaTypes: ['text', 'image'],
        async execute(_m, input): Promise<ExecutionResult> {
          if (input.prompt === 'generate cat') {
            return { mediaType: 'image', text: 'https://img.example/cat.png', metadata: {} }
          }
          return { mediaType: 'text', text: `described: ${input.prompt}`, metadata: {} }
        },
      }

      const service = new WorkflowExecutionService(provider)
      const ctx = makeCtx({ rootInputs: { input: 'generate cat' } })

      const result = await service.executeWorkflow(
        [n('gen'), n('describe')],
        [e('gen', 'describe')],
        ctx,
      )

      expect(result.status).toBe('completed')
      const describeResult = result.nodeResults.find((r) => r.nodeId === 'describe')
      expect(describeResult?.outputData?.['text']).toContain('https://img.example/cat.png')
    })
  })
})
