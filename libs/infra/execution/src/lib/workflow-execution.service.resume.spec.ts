// Resume-from-checkpoint tests for WorkflowExecutionService.
//
// Crash recovery re-enters a graph at its roots. Without a checkpoint, every
// node that already finished is re-invoked against its provider — re-billing the
// owner and repeating side effects. `ctx.resumeResults` carries those finished
// nodes so the engine replays their persisted output instead.
//
// The invariants that matter:
//   • a resumed node never reaches its provider
//   • a resumed node never has a status written back (its DB row is already
//     terminal; re-seeding it would flip 'completed' → 'queued' and lose output)
//   • downstream nodes still read a resumed node's output
//   • absent resumeResults, behaviour is byte-for-byte what it was before
import { describe, it, expect, vi } from 'vitest'

import { WorkflowExecutionService } from './workflow-execution.service'

import type { IExecutionProvider, ExecutionInput, ExecutionResult } from './execution.types'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
} from './workflow-execution.service'

// ── Harness ───────────────────────────────────────────────────────────────────

/** Provider that records every prompt it is asked to execute. */
function countingProvider(): IExecutionProvider & { calls: string[] } {
  const calls: string[] = []
  return {
    id: 'counting',
    calls,
    supportedMediaTypes: ['text'],
    async execute(_modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
      calls.push(input.prompt)
      return { mediaType: 'text', text: `executed:${input.prompt}`, metadata: {} }
    },
  }
}

function makeCtx(
  overrides: Partial<WorkflowExecutionContext> = {},
): WorkflowExecutionContext & { statusLog: Record<string, NodeResult[]> } {
  const statusLog: Record<string, NodeResult[]> = {}
  const ctx: WorkflowExecutionContext & { statusLog: Record<string, NodeResult[]> } = {
    runId: 'run-resume-test',
    rootInputs: {},
    statusLog,
    async resolveLensTemplate() {
      return '[[input]]'
    },
    async onNodeStatusChange(nodeId, result) {
      statusLog[nodeId] = [...(statusLog[nodeId] ?? []), { ...result }]
    },
    ...overrides,
  }
  return ctx
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

/** A checkpoint entry as the worker builds it from workflow_node_results. */
function completed(nodeId: string, text: string): NodeResult {
  return { nodeId, status: 'completed', outputData: { text } }
}

// ── No checkpoint: behaviour must be unchanged ────────────────────────────────

describe('resumeResults absent', () => {
  it('executes every node normally', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({ rootInputs: { input: 'seed' } })

    const result = await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(result.status).toBe('completed')
    expect(provider.calls).toHaveLength(2)
  })

  it('still seeds a status for every node', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({ rootInputs: { input: 'seed' } })

    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(ctx.statusLog['a']).toBeDefined()
    expect(ctx.statusLog['b']).toBeDefined()
  })

  it('treats an empty checkpoint map the same as no checkpoint', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({ rootInputs: { input: 'seed' }, resumeResults: new Map() })

    const result = await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(result.status).toBe('completed')
    expect(provider.calls).toHaveLength(2)
  })
})

// ── Partial checkpoint ────────────────────────────────────────────────────────

describe('resumeResults covering some nodes', () => {
  it('does not re-invoke the provider for a resumed node', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([['a', completed('a', 'from checkpoint')]]),
    })

    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    // Only node b reached the provider.
    expect(provider.calls).toHaveLength(1)
  })

  it('never writes a status back for a resumed node', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([['a', completed('a', 'from checkpoint')]]),
    })

    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    // A write here would flip the already-terminal row back to queued.
    expect(ctx.statusLog['a']).toBeUndefined()
    expect(ctx.statusLog['b']).toBeDefined()
  })

  it('feeds the resumed output to the downstream node', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([['a', completed('a', 'from checkpoint')]]),
    })

    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(provider.calls[0]).toContain('from checkpoint')
  })

  it('reports the resumed node as completed in the run result', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([['a', completed('a', 'from checkpoint')]]),
    })

    const result = await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(result.status).toBe('completed')
    const a = result.nodeResults.find((r) => r.nodeId === 'a')
    expect(a?.status).toBe('completed')
    expect(a?.outputData?.['text']).toBe('from checkpoint')
  })

  it('emits a node_completed event marked resumed', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const onEvent = vi.fn()
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([['a', completed('a', 'from checkpoint')]]),
      onEvent,
    })

    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    const resumedEvents = onEvent.mock.calls
      .map(([evt]) => evt)
      .filter((evt) => evt.nodeId === 'a' && evt.metadata?.resumed === true)
    expect(resumedEvents).toHaveLength(1)
  })

  it('resumes a mid-graph node and still runs the tail', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([
        ['a', completed('a', 'a-done')],
        ['b', completed('b', 'b-done')],
      ]),
    })

    const result = await service.executeWorkflow(
      [n('a'), n('b'), n('c')],
      [e('a', 'b'), e('b', 'c')],
      ctx,
    )

    expect(result.status).toBe('completed')
    // Only c executes, and it reads b's checkpointed output.
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]).toContain('b-done')
  })
})

// ── Full checkpoint ───────────────────────────────────────────────────────────

describe('resumeResults covering every node', () => {
  it('completes without touching the provider at all', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([
        ['a', completed('a', 'a-done')],
        ['b', completed('b', 'b-done')],
      ]),
    })

    const result = await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(result.status).toBe('completed')
    expect(provider.calls).toHaveLength(0)
  })

  it('writes no node statuses at all', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([
        ['a', completed('a', 'a-done')],
        ['b', completed('b', 'b-done')],
      ]),
    })

    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(Object.keys(ctx.statusLog)).toHaveLength(0)
  })

  it('ignores checkpoint entries for nodes no longer in the graph', async () => {
    const provider = countingProvider()
    const service = new WorkflowExecutionService(provider)
    const ctx = makeCtx({
      rootInputs: { input: 'seed' },
      resumeResults: new Map([
        ['a', completed('a', 'a-done')],
        // 'deleted' was removed from the workflow since the previous attempt.
        ['deleted', completed('deleted', 'stale')],
      ]),
    })

    const result = await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    expect(result.status).toBe('completed')
    expect(result.nodeResults.map((r) => r.nodeId).sort()).toEqual(['a', 'b'])
  })
})
