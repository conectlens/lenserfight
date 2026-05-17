// Merge strategy integration tests — validates merge strategies through the
// full WorkflowExecutionService.executeWorkflow() pipeline.
import { describe, it, expect } from 'vitest'

import { WorkflowExecutionService } from './workflow-execution.service'

import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
} from './workflow-execution.service'
import type { IExecutionProvider, ExecutionInput, ExecutionResult } from './execution.types'

// ── Factories ────────────────────────────────────────────────────────────────

function labelProvider(): IExecutionProvider {
  return {
    id: 'label',
    supportedMediaTypes: ['text'],
    async execute(_model: string, input: ExecutionInput): Promise<ExecutionResult> {
      // Echo back the prompt so we can verify what was merged as input
      return { mediaType: 'text', text: input.prompt, metadata: {} }
    },
  }
}

function makeCtx(
  overrides: Partial<WorkflowExecutionContext> = {},
): WorkflowExecutionContext {
  return {
    runId: 'run-merge-test',
    rootInputs: {},
    async resolveLensTemplate() {
      return '[[input]]'
    },
    async onNodeStatusChange() { /* noop */ },
    ...overrides,
  }
}

function n(id: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return { id, lensId: 'test-lens', ...overrides }
}

function e(
  sourceNodeId: string,
  targetNodeId: string,
  overrides: Partial<WorkflowEdge> = {},
): WorkflowEdge {
  return {
    sourceNodeId,
    targetNodeId,
    sourceOutputKey: 'text',
    targetParamLabel: 'input',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WorkflowExecutionService — merge strategies', () => {
  it('last_write_wins — converging node receives last edge value', async () => {
    // A→D (text="alpha"), B→D (text="beta") — both feed 'input' param on D
    const provider: IExecutionProvider = {
      id: 'id-echo',
      supportedMediaTypes: ['text'],
      async execute(_m, input): Promise<ExecutionResult> {
        // Root nodes echo their rootInput, D echoes merged input
        return { mediaType: 'text', text: input.prompt, metadata: {} }
      },
    }

    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      async resolveLensTemplate() {
        return '[[input]]'
      },
    })

    const result = await service.executeWorkflow(
      [n('A'), n('B'), n('D')],
      [
        e('A', 'D', { mergeStrategy: 'last_write_wins' }),
        e('B', 'D', { mergeStrategy: 'last_write_wins' }),
      ],
      ctx,
    )

    expect(result.status).toBe('completed')
    // D should have received merged input via last_write_wins
    const dResult = result.nodeResults.find((r) => r.nodeId === 'D')
    expect(dResult?.status).toBe('completed')
  })

  it('concat — converging node receives newline-joined values', async () => {
    const outputs = new Map<string, string>()
    const provider: IExecutionProvider = {
      id: 'concat-test',
      supportedMediaTypes: ['text'],
      async execute(_m, input): Promise<ExecutionResult> {
        return { mediaType: 'text', text: input.prompt, metadata: {} }
      },
    }

    const service = new WorkflowExecutionService(provider)
    const statusLog: Record<string, NodeResult[]> = {}
    const ctx = makeCtx({
      rootInputs: { input: 'root' },
      async resolveLensTemplate() {
        return '[[input]]'
      },
      async onNodeStatusChange(nodeId, result) {
        statusLog[nodeId] = [...(statusLog[nodeId] ?? []), { ...result }]
      },
    })

    const result = await service.executeWorkflow(
      [n('A'), n('B'), n('C')],
      [
        e('A', 'C', { mergeStrategy: 'concat' }),
        e('B', 'C', { mergeStrategy: 'concat' }),
      ],
      ctx,
    )

    expect(result.status).toBe('completed')
    // C should have gotten concat of A and B outputs
    const cResult = result.nodeResults.find((r) => r.nodeId === 'C')
    expect(cResult?.status).toBe('completed')
    // The text output of C should contain both upstream outputs joined
    const cOutput = cResult?.outputData?.['text'] as string
    expect(cOutput).toContain('root')
  })

  it('array — converging node receives array of values', async () => {
    const provider: IExecutionProvider = {
      id: 'array-test',
      supportedMediaTypes: ['text'],
      async execute(_m, input): Promise<ExecutionResult> {
        return { mediaType: 'text', text: input.prompt, metadata: {} }
      },
    }

    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'start' },
      async resolveLensTemplate() {
        return '[[input]]'
      },
    })

    const result = await service.executeWorkflow(
      [n('A'), n('B'), n('D')],
      [
        e('A', 'D', { mergeStrategy: 'array' }),
        e('B', 'D', { mergeStrategy: 'array' }),
      ],
      ctx,
    )

    expect(result.status).toBe('completed')
    const dResult = result.nodeResults.find((r) => r.nodeId === 'D')
    expect(dResult?.status).toBe('completed')
  })

  it('json_object — converging node receives keyed object', async () => {
    const provider: IExecutionProvider = {
      id: 'obj-test',
      supportedMediaTypes: ['text'],
      async execute(_m, input): Promise<ExecutionResult> {
        return { mediaType: 'text', text: input.prompt, metadata: {} }
      },
    }

    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'init' },
      async resolveLensTemplate() {
        return '[[input]]'
      },
    })

    const result = await service.executeWorkflow(
      [n('A'), n('B'), n('D')],
      [
        e('A', 'D', { mergeStrategy: 'json_object' }),
        e('B', 'D', { mergeStrategy: 'json_object' }),
      ],
      ctx,
    )

    expect(result.status).toBe('completed')
    const dResult = result.nodeResults.find((r) => r.nodeId === 'D')
    expect(dResult?.status).toBe('completed')
  })

  it('node-level default merge applies when edges have no strategy', async () => {
    const provider: IExecutionProvider = {
      id: 'default-merge',
      supportedMediaTypes: ['text'],
      async execute(_m, input): Promise<ExecutionResult> {
        return { mediaType: 'text', text: input.prompt, metadata: {} }
      },
    }

    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'go' },
      async resolveLensTemplate() {
        return '[[input]]'
      },
    })

    // D has config.merge = 'array' as default
    const result = await service.executeWorkflow(
      [n('A'), n('B'), n('D', { config: { merge: 'array' } } as any)],
      [e('A', 'D'), e('B', 'D')],
      ctx,
    )

    expect(result.status).toBe('completed')
  })
})
