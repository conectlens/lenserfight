// Core DAG execution tests for WorkflowExecutionService.
// Covers the main executeWorkflow() path: topology, conditional edges,
// parent-failure policies, retry, timeout, cancellation, moderation, and memory.
import { describe, it, expect, vi, afterEach } from 'vitest'

import { WorkflowExecutionService } from './workflow-execution.service'
import { registerNodeRunner, clearNodeRunners } from './runners/node-runner.registry'
import { SetVariablesRunner } from './runners/set-variables.runner'
import { JsonTransformRunner } from './runners/json-transform.runner'

import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
} from './workflow-execution.service'
import type { IExecutionProvider, ExecutionInput, ExecutionResult } from './execution.types'
import type { ModerationDecision, ModerationGateway } from './execution.types'

// ── Provider factories ────────────────────────────────────────────────────────

function echoProvider(
  getText: (prompt: string) => string = (p) => p,
): IExecutionProvider {
  return {
    id: 'echo',
    supportedMediaTypes: ['text'],
    async execute(_modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
      return { mediaType: 'text', text: getText(input.prompt), metadata: {} }
    },
  }
}

function failingProvider(message = 'provider_error'): IExecutionProvider {
  return {
    id: 'fail',
    supportedMediaTypes: ['text'],
    async execute(): Promise<ExecutionResult> {
      throw new Error(message)
    },
  }
}

function slowProvider(delayMs: number): IExecutionProvider {
  return {
    id: 'slow',
    supportedMediaTypes: ['text'],
    execute: (_m, _i, signal) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => resolve({ mediaType: 'text', text: 'slow', metadata: {} }),
          delayMs,
        )
        signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          // Throw a non-AbortError with 'timeout' in message so isTimeoutError()
          // classifies it as cause='timeout' → timed_out status (not cancelled).
          reject(new Error('execution timeout'))
        }, { once: true })
      }),
  }
}

// ── Context factory ───────────────────────────────────────────────────────────

function makeCtx(
  overrides: Partial<WorkflowExecutionContext> = {},
): WorkflowExecutionContext & { statusLog: Record<string, NodeResult[]> } {
  const statusLog: Record<string, NodeResult[]> = {}
  const ctx: WorkflowExecutionContext & { statusLog: Record<string, NodeResult[]> } = {
    runId: 'run-dag-test',
    rootInputs: {},
    statusLog,
    async resolveLensTemplate() {
      return 'prompt: [[input]]'
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

function lastStatus(statusLog: Record<string, NodeResult[]>, nodeId: string): string | undefined {
  const entries = statusLog[nodeId]
  return entries?.[entries.length - 1]?.status
}

// ── Single-node workflow ───────────────────────────────────────────────────────

describe('single-node workflow', () => {
  it('completes with status completed', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'hello' } })
    const result = await service.executeWorkflow([n('a')], [], ctx)
    expect(result.status).toBe('completed')
    expect(result.nodeResults[0].status).toBe('completed')
  })

  it('persists node output data', async () => {
    const service = new WorkflowExecutionService(echoProvider(() => 'my output'))
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    const result = await service.executeWorkflow([n('a')], [], ctx)
    expect(result.nodeResults[0].outputData?.['text']).toBe('my output')
  })
})

// ── Linear chain A→B→C ────────────────────────────────────────────────────────

describe('linear chain A→B→C', () => {
  it('executes all nodes and completes', async () => {
    const service = new WorkflowExecutionService(echoProvider((p) => `[${p}]`))
    const ctx = makeCtx({ rootInputs: { input: 'start' } })
    const result = await service.executeWorkflow(
      [n('a'), n('b'), n('c')],
      [e('a', 'b'), e('b', 'c')],
      ctx,
    )
    expect(result.status).toBe('completed')
    expect(result.nodeResults.every((r) => r.status === 'completed')).toBe(true)
  })

  it('nodes start in awaiting_dependency until their parent completes', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    // Node b must have gone through awaiting_dependency → queued → ... → completed
    const bHistory = ctx.statusLog['b']?.map((r) => r.status) ?? []
    expect(bHistory[0]).toBe('awaiting_dependency')
    expect(bHistory[bHistory.length - 1]).toBe('completed')
  })
})

// ── Diamond graph ─────────────────────────────────────────────────────────────

describe('diamond graph A→(B,C)→D', () => {
  it('completes all four nodes', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'go' } })
    const result = await service.executeWorkflow(
      [n('a'), n('b'), n('c'), n('d')],
      [e('a', 'b'), e('a', 'c'), e('b', 'd'), e('c', 'd')],
      ctx,
    )
    expect(result.status).toBe('completed')
    expect(result.nodeResults).toHaveLength(4)
    expect(result.nodeResults.every((r) => r.status === 'completed')).toBe(true)
  })

  it('D only runs after both B and C have completed', async () => {
    const completionOrder: string[] = []
    const trackingProvider: IExecutionProvider = {
      id: 'tracking',
      supportedMediaTypes: ['text'],
      async execute(_modelId, _input, _signal): Promise<ExecutionResult> {
        return { mediaType: 'text', text: 'ok', metadata: {} }
      },
    }
    const ctx = makeCtx({
      rootInputs: { input: 'go' },
      async onNodeStatusChange(nodeId, result) {
        if (result.status === 'completed') completionOrder.push(nodeId)
        ctx.statusLog[nodeId] = [...(ctx.statusLog[nodeId] ?? []), { ...result }]
      },
    })
    const service = new WorkflowExecutionService(trackingProvider)
    await service.executeWorkflow(
      [n('a'), n('b'), n('c'), n('d')],
      [e('a', 'b'), e('a', 'c'), e('b', 'd'), e('c', 'd')],
      ctx,
    )
    const dIndex = completionOrder.indexOf('d')
    const bIndex = completionOrder.indexOf('b')
    const cIndex = completionOrder.indexOf('c')
    expect(dIndex).toBeGreaterThan(bIndex)
    expect(dIndex).toBeGreaterThan(cIndex)
  })
})

// ── Conditional edges ─────────────────────────────────────────────────────────

describe('conditional edges', () => {
  it('skips an edge whose condition is not satisfied (equals)', async () => {
    // nodeA outputs "X"; edge A→B has condition equals "Y" → B never gets input
    const service = new WorkflowExecutionService(echoProvider(() => 'X'))
    const ctx = makeCtx({ rootInputs: { input: 'go' } })
    const nodes = [n('a'), n('b'), n('c')]
    const edges: WorkflowEdge[] = [
      { ...e('a', 'b'), condition: { type: 'equals', value: 'Y' } },
      e('a', 'c'),
    ]
    const result = await service.executeWorkflow(nodes, edges, ctx)
    // c (no condition) completes; b has its conditional edge not fulfilled but
    // b still runs (with empty merged input) because onParentFailure defaults to skip
    // which only applies when a parent is in a non-success status.
    // Conditional edges reduce available inputs, not parent status — so b runs.
    expect(result.nodeResults.find((r) => r.nodeId === 'c')?.status).toBe('completed')
  })

  it('uses a present-condition edge: passes when value is non-empty', async () => {
    const service = new WorkflowExecutionService(echoProvider(() => 'some-value'))
    const ctx = makeCtx({ rootInputs: { input: 'go' } })
    const nodes = [n('a'), n('b')]
    const edges: WorkflowEdge[] = [
      { ...e('a', 'b'), condition: { type: 'present' } },
    ]
    const result = await service.executeWorkflow(nodes, edges, ctx)
    expect(result.nodeResults.find((r) => r.nodeId === 'b')?.status).toBe('completed')
  })

  it('treats a truthy-condition edge: empty string output invalidates node A and skips B', async () => {
    // echoProvider returning '' causes validateOutput to fail (isPresent('') = false),
    // graduating A to `invalidated`. B's parent-status check then sees a non-successful
    // parent and falls through to the default skip policy.
    const service = new WorkflowExecutionService(echoProvider(() => ''))
    const ctx = makeCtx({ rootInputs: { input: 'go' } })
    const nodes = [n('a'), n('b')]
    const edges: WorkflowEdge[] = [
      { ...e('a', 'b'), condition: { type: 'truthy' } },
    ]
    await service.executeWorkflow(nodes, edges, ctx)
    expect(lastStatus(ctx.statusLog, 'b')).toBe('skipped')
  })
})

// ── Parent failure policies ───────────────────────────────────────────────────

describe('onParentFailure=skip (default)', () => {
  it('marks downstream node skipped when parent fails', async () => {
    const nodes = [n('a'), n('b')]
    const edges = [e('a', 'b')]
    const service = new WorkflowExecutionService(failingProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    const result = await service.executeWorkflow(nodes, edges, ctx)
    expect(result.status).toBe('failed')
    expect(result.nodeResults.find((r) => r.nodeId === 'b')?.status).toBe('skipped')
  })
})

describe('onParentFailure=propagate', () => {
  it('marks downstream node failed when parent fails', async () => {
    const nodes = [
      n('a'),
      n('b', { config: { onParentFailure: 'propagate' } }),
    ]
    const edges = [e('a', 'b')]
    const service = new WorkflowExecutionService(failingProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    const result = await service.executeWorkflow(nodes, edges, ctx)
    expect(result.status).toBe('failed')
    const bResult = result.nodeResults.find((r) => r.nodeId === 'b')!
    expect(bResult.status).toBe('failed')
    expect(bResult.error).toBe('upstream_failure')
  })
})

describe('onParentFailure=substitute_default', () => {
  it('runs the node with empty values when parent fails (does not skip)', async () => {
    // With substitute_default the node still runs — it gets an empty input.
    // The echo provider receives an empty-ish prompt so it may complete or
    // fail contract validation; here the template has no required placeholders.
    const nodes = [
      n('a'),
      n('b', { config: { onParentFailure: 'substitute_default' } }),
    ]
    const edges = [e('a', 'b')]

    const callCounts: Record<string, number> = {}
    const trackingProvider: IExecutionProvider = {
      id: 'tracking',
      supportedMediaTypes: ['text'],
      async execute(modelId): Promise<ExecutionResult> {
        callCounts[modelId] = (callCounts[modelId] ?? 0) + 1
        if (Object.keys(callCounts).length === 1 && callCounts[modelId] === 1) {
          throw new Error('first_node_fails')
        }
        return { mediaType: 'text', text: 'fallback', metadata: {} }
      },
    }

    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    await new WorkflowExecutionService(trackingProvider).executeWorkflow(nodes, edges, ctx)

    // b should NOT be skipped; it either completed or failed depending on
    // whether the empty render passes the placeholder check.
    const bStatus = lastStatus(ctx.statusLog, 'b')
    expect(bStatus).not.toBe('skipped')
  })
})

// ── Run-level status derivation ───────────────────────────────────────────────

describe('run-level status derivation', () => {
  it('returns completed when all nodes succeed', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    const result = await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)
    expect(result.status).toBe('completed')
  })

  it('returns failed when any node fails', async () => {
    const service = new WorkflowExecutionService(failingProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    const result = await service.executeWorkflow([n('a')], [], ctx)
    expect(result.status).toBe('failed')
  })

  it('returns failed when a node times out', async () => {
    const service = new WorkflowExecutionService(slowProvider(500))
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
    })
    // Force a very short timeout
    const result = await service.executeWorkflow(
      [n('a', { config: { timeoutMs: 1, retry: { attempts: 1 } } })],
      [],
      ctx,
    )
    expect(result.status).toBe('failed')
    expect(result.nodeResults[0].status).toBe('timed_out')
  })

  it('returns cancelled when AbortSignal is aborted before execution starts', async () => {
    const controller = new AbortController()
    controller.abort()
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ signal: controller.signal, rootInputs: { input: 'x' } })
    const result = await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)
    expect(result.status).toBe('cancelled')
  })

  it('returns cancelled when the signal is aborted mid-run', async () => {
    const controller = new AbortController()
    let resolveNodeA!: () => void
    // Barrier: test waits until provider.execute() has been called before aborting,
    // ensuring resolveNodeA is assigned and the signal listener is registered.
    let nodeAStarted!: () => void
    const nodeAStartedPromise = new Promise<void>((r) => { nodeAStarted = r })

    const pausingProvider: IExecutionProvider = {
      id: 'pausing',
      supportedMediaTypes: ['text'],
      execute: (_m, _i, signal) =>
        new Promise((resolve, reject) => {
          resolveNodeA = () => resolve({ mediaType: 'text', text: 'done', metadata: {} })
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          nodeAStarted()
        }),
    }

    const service = new WorkflowExecutionService(pausingProvider)
    const ctx = makeCtx({ signal: controller.signal, rootInputs: { input: 'x' } })
    const runPromise = service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)

    // Wait until the provider has been entered before aborting.
    await nodeAStartedPromise
    controller.abort()
    resolveNodeA()
    const result = await runPromise
    expect(result.status).toBe('cancelled')
  })
})

// ── Retry logic ────────────────────────────────────────────────────────────────

describe('retry logic', () => {
  it('retries up to the configured attempt count on provider_error', async () => {
    let callCount = 0
    const retriedProvider: IExecutionProvider = {
      id: 'retry',
      supportedMediaTypes: ['text'],
      async execute(): Promise<ExecutionResult> {
        callCount++
        if (callCount < 3) throw new Error('provider error')
        return { mediaType: 'text', text: 'ok', metadata: {} }
      },
    }
    const service = new WorkflowExecutionService(retriedProvider)
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
    })
    const result = await service.executeWorkflow(
      [n('a', { config: { retry: { attempts: 3, backoffMs: 0 }, timeoutMs: 10_000 } })],
      [],
      ctx,
    )
    expect(result.status).toBe('completed')
    expect(callCount).toBe(3)
    expect(result.nodeResults[0].attempts).toBe(3)
  })

  it('fails the node after exhausting all retries', async () => {
    const alwaysFail: IExecutionProvider = {
      id: 'fail',
      supportedMediaTypes: ['text'],
      async execute(): Promise<ExecutionResult> {
        throw new Error('always fails')
      },
    }
    const service = new WorkflowExecutionService(alwaysFail)
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    const result = await service.executeWorkflow(
      [n('a', { config: { retry: { attempts: 2, backoffMs: 0 } } })],
      [],
      ctx,
    )
    expect(result.status).toBe('failed')
    expect(result.nodeResults[0].status).toBe('failed')
    expect(result.nodeResults[0].attempts).toBe(2)
  })
})

// ── Moderation gateway ────────────────────────────────────────────────────────

describe('moderation gateway', () => {
  function blockingGateway(): ModerationGateway {
    return {
      async check(): Promise<ModerationDecision> {
        return { allowed: false, policy: 'strict', reason: 'test_block' }
      },
    }
  }

  function allowingGateway(): ModerationGateway {
    return {
      async check(): Promise<ModerationDecision> {
        return { allowed: true, policy: 'off' }
      },
    }
  }

  it('fails node with moderation_blocked on input block', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
      moderation: blockingGateway(),
    })
    const result = await service.executeWorkflow(
      [n('a', { config: { moderation: 'input' } })],
      [],
      ctx,
    )
    expect(result.status).toBe('failed')
    expect(result.nodeResults[0].status).toBe('failed')
    expect(result.nodeResults[0].error).toBe('moderation_blocked')
  })

  it('fails node with moderation_blocked on output block', async () => {
    const service = new WorkflowExecutionService(echoProvider(() => 'flagged content'))
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
      moderation: blockingGateway(),
    })
    const result = await service.executeWorkflow(
      [n('a', { config: { moderation: 'output' } })],
      [],
      ctx,
    )
    expect(result.status).toBe('failed')
    expect(result.nodeResults[0].error).toBe('moderation_blocked')
  })

  it('allows execution when gateway returns allowed=true', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
      moderation: allowingGateway(),
    })
    const result = await service.executeWorkflow(
      [n('a', { config: { moderation: 'both' } })],
      [],
      ctx,
    )
    expect(result.status).toBe('completed')
  })

  it('skips moderation when policy is off (default)', async () => {
    let checkCalled = false
    const spyGateway: ModerationGateway = {
      async check(): Promise<ModerationDecision> {
        checkCalled = true
        return { allowed: false, policy: 'strict', reason: 'should_not_be_called' }
      },
    }
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' }, moderation: spyGateway })
    // No moderation config = default 'off'
    await service.executeWorkflow([n('a')], [], ctx)
    expect(checkCalled).toBe(false)
  })
})

// ── Memory flush sink ─────────────────────────────────────────────────────────

describe('memory flush sink', () => {
  it('calls onNodeCompleted for each completed node', async () => {
    const onNodeCompleted = vi.fn()
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
      memory: { onNodeCompleted },
    })
    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)
    expect(onNodeCompleted).toHaveBeenCalledTimes(2)
    expect(onNodeCompleted).toHaveBeenCalledWith('a', 'on_success')
    expect(onNodeCompleted).toHaveBeenCalledWith('b', 'on_success')
  })

  it('calls onRunCompleted with completed when run succeeds', async () => {
    const onRunCompleted = vi.fn()
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' }, memory: { onRunCompleted } })
    await service.executeWorkflow([n('a')], [], ctx)
    expect(onRunCompleted).toHaveBeenCalledWith('completed')
  })

  it('calls onRunCompleted with failed when run fails', async () => {
    const onRunCompleted = vi.fn()
    const service = new WorkflowExecutionService(failingProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' }, memory: { onRunCompleted } })
    await service.executeWorkflow([n('a')], [], ctx)
    expect(onRunCompleted).toHaveBeenCalledWith('failed')
  })

  it('calls onRunCompleted with cancelled when run is cancelled', async () => {
    const onRunCompleted = vi.fn()
    const controller = new AbortController()
    controller.abort()
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ signal: controller.signal, rootInputs: { input: 'x' }, memory: { onRunCompleted } })
    await service.executeWorkflow([n('a')], [], ctx)
    expect(onRunCompleted).toHaveBeenCalledWith('cancelled')
  })

  it('swallows errors thrown by onRunCompleted', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
      memory: {
        async onRunCompleted() {
          throw new Error('memory flush exploded')
        },
      },
    })
    await expect(service.executeWorkflow([n('a')], [], ctx)).resolves.toBeDefined()
  })
})

// ── Observability events ──────────────────────────────────────────────────────

describe('onEvent callback', () => {
  it('emits node_queued and node_started for root nodes', async () => {
    const events: string[] = []
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
      onEvent: (ev) => { events.push(ev.name) },
    })
    await service.executeWorkflow([n('a')], [], ctx)
    expect(events).toContain('node_queued')
    expect(events).toContain('node_started')
    expect(events).toContain('node_completed')
  })

  it('swallows errors thrown by onEvent', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({
      rootInputs: { input: 'x' },
      async onEvent() { throw new Error('event handler exploded') },
    })
    await expect(service.executeWorkflow([n('a')], [], ctx)).resolves.toBeDefined()
  })
})

// ── Provenance callbacks ──────────────────────────────────────────────────────

describe('onProvenance callback', () => {
  it('emits a handoff record for each resolved edge', async () => {
    const handoffs: unknown[] = []
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({
      rootInputs: { input: 'start' },
      onProvenance: (h) => { handoffs.push(h) },
    })
    await service.executeWorkflow([n('a'), n('b')], [e('a', 'b')], ctx)
    expect(handoffs).toHaveLength(1)
    expect((handoffs[0] as { sourceNodeId: string }).sourceNodeId).toBe('a')
    expect((handoffs[0] as { targetNodeId: string }).targetNodeId).toBe('b')
  })
})

// ── Duplicate/missing node edge cases ────────────────────────────────────────

describe('edge with missing target node id', () => {
  it('still completes the source node; the missing target never runs', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'x' } })
    // Edge points to a node not in the list — engine skips it safely
    const result = await service.executeWorkflow(
      [n('a')],
      [e('a', 'ghost')],
      ctx,
    )
    // a completes; ghost has no nodeMap entry so it is simply never scheduled
    expect(result.nodeResults.find((r) => r.nodeId === 'a')?.status).toBe('completed')
  })
})

// ── Empty workflow ─────────────────────────────────────────────────────────────

describe('empty workflow', () => {
  it('completes immediately with no node results when nodes list is empty', async () => {
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx()
    const result = await service.executeWorkflow([], [], ctx)
    expect(result.status).toBe('completed')
    expect(result.nodeResults).toHaveLength(0)
  })
})

// ── detectCycle static method ─────────────────────────────────────────────────

describe('WorkflowExecutionService.detectCycle', () => {
  it('delegates to validator detectCycle and returns null for acyclic graph', () => {
    const result = WorkflowExecutionService.detectCycle(
      [{ id: 'a' }, { id: 'b' }],
      [{ sourceNodeId: 'a', targetNodeId: 'b' }],
    )
    expect(result).toBeNull()
  })

  it('returns cycle node ids for a cyclic graph', () => {
    const result = WorkflowExecutionService.detectCycle(
      [{ id: 'a' }, { id: 'b' }],
      [
        { sourceNodeId: 'a', targetNodeId: 'b' },
        { sourceNodeId: 'b', targetNodeId: 'a' },
      ],
    )
    expect(result).not.toBeNull()
    expect(result).toEqual(expect.arrayContaining(['a', 'b']))
  })
})

// ── CN: Node Runner dispatch integration ─────────────────────────────────────

describe('Node Runner dispatch', () => {
  afterEach(() => {
    clearNodeRunners()
  })

  it('dispatches to SetVariablesRunner when nodeType is set_variables', async () => {
    registerNodeRunner(new SetVariablesRunner())
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'hello' } })

    const result = await service.executeWorkflow(
      [n('sv', { config: { nodeType: 'set_variables', variables: { myVar: 'myValue' } } })],
      [],
      ctx,
    )

    expect(result.status).toBe('completed')
    expect(result.nodeResults[0].status).toBe('completed')
    expect(result.nodeResults[0].outputData?.['myVar']).toBe('myValue')
  })

  it('falls back to provider when no runner registered for nodeType', async () => {
    // No runner registered for 'text' — should use provider
    const service = new WorkflowExecutionService(echoProvider(() => 'provider response'))
    const ctx = makeCtx({ rootInputs: { input: 'world' } })

    const result = await service.executeWorkflow(
      [n('a', { config: { nodeType: 'text' } })],
      [],
      ctx,
    )

    expect(result.status).toBe('completed')
    expect(result.nodeResults[0].envelope?.output).toContain('provider response')
  })

  it('propagates runner variable mutations to downstream root inputs', async () => {
    registerNodeRunner(new SetVariablesRunner())
    const service = new WorkflowExecutionService(echoProvider((prompt) => `got: ${prompt}`))
    const ctx = makeCtx({ rootInputs: { input: 'original' } })

    const result = await service.executeWorkflow(
      [
        n('sv', { config: { nodeType: 'set_variables', variables: { extra: 'injected' } } }),
        n('b'),
      ],
      [e('sv', 'b')],
      ctx,
    )

    expect(result.status).toBe('completed')
    // The variable mutation from sv should be in rootInputs
    expect(ctx.rootInputs['extra']).toBe('injected')
  })

  it('handles runner failure gracefully', async () => {
    // Register a broken runner that throws
    registerNodeRunner({
      nodeType: 'set_variables',
      async execute() {
        throw new Error('Runner exploded')
      },
    })
    const service = new WorkflowExecutionService(echoProvider())
    const ctx = makeCtx({ rootInputs: { input: 'test' } })

    const result = await service.executeWorkflow(
      [n('sv', { config: { nodeType: 'set_variables' } })],
      [],
      ctx,
    )

    expect(result.nodeResults[0].status).toBe('failed')
    expect(result.nodeResults[0].error).toContain('Runner exploded')
  })
})
