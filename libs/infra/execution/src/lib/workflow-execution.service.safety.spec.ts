// Z10 — runtime safety controls: wave concurrency cap, context size cap,
// budget halt via getBudgetSnapshot.
import { describe, it, expect, vi } from 'vitest'

import {
  WorkflowExecutionService,
  DEFAULT_MAX_USER_BUDGET_CREDITS,
} from './workflow-execution.service'

import type { BudgetSnapshot } from './budget-reconciler'
import type { IExecutionProvider, ExecutionInput, ExecutionResult } from './execution.types'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
} from './workflow-execution.service'


// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNode(id: string): WorkflowNode {
  return { id, lensId: 'test-lens' }
}

function makeCtx(overrides: Partial<WorkflowExecutionContext> = {}): WorkflowExecutionContext {
  return {
    runId: 'run-test',
    rootInputs: {},
    // No placeholder — avoids PlaceholderUnboundError in tests that don't care
    // about template rendering.
    async resolveLensTemplate() {
      return 'simple prompt'
    },
    async onNodeStatusChange(_nodeId: string, _result: NodeResult) {},
    ...overrides,
  }
}

function makeTextProvider(
  getText: (nodeId: string) => string = () => 'ok',
  onExecute?: (prompt: string) => void,
): IExecutionProvider {
  return {
    id: 'text',
    supportedMediaTypes: ['text'],
    async execute(_modelId: string, input: ExecutionInput): Promise<ExecutionResult> {
      onExecute?.(input.prompt)
      return {
        mediaType: 'text',
        text: getText(input.prompt),
        metadata: { input_tokens: 1, output_tokens: 1 },
      }
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DEFAULT_MAX_USER_BUDGET_CREDITS (Z10)', () => {
  it('is a positive finite number suitable as a per-user credit ceiling', () => {
    expect(DEFAULT_MAX_USER_BUDGET_CREDITS).toBeGreaterThan(0)
    expect(Number.isFinite(DEFAULT_MAX_USER_BUDGET_CREDITS)).toBe(true)
  })
})

describe('wave concurrency cap (Z10)', () => {
  it('runs at most maxWaveConcurrency nodes simultaneously in a single wave', async () => {
    const MAX = 4 // lower than the default 10 to make the test fast and reliable
    const NODE_COUNT = 12

    let currentConcurrent = 0
    let maxObservedConcurrent = 0

    const concurrencyTrackingProvider: IExecutionProvider = {
      id: 'tracking',
      supportedMediaTypes: ['text'],
      async execute(): Promise<ExecutionResult> {
        currentConcurrent++
        maxObservedConcurrent = Math.max(maxObservedConcurrent, currentConcurrent)
        // Yield to event loop so throttled tasks can queue up
        await new Promise<void>((r) => setImmediate(r))
        currentConcurrent--
        return { mediaType: 'text', text: 'done', metadata: {} }
      },
    }

    // 12 independent nodes (no edges) → all land in wave 0 at once
    const nodes: WorkflowNode[] = Array.from({ length: NODE_COUNT }, (_, i) =>
      makeNode(`node-${i}`)
    )
    const edges: WorkflowEdge[] = []

    const service = new WorkflowExecutionService(concurrencyTrackingProvider)
    await service.executeWorkflow(nodes, edges, makeCtx({ maxWaveConcurrency: MAX }))

    expect(maxObservedConcurrent).toBeGreaterThan(0)
    expect(maxObservedConcurrent).toBeLessThanOrEqual(MAX)
  })
})

describe('context size cap (Z10)', () => {
  it('fails a node with context_too_large when merged inputs exceed 512 KB', async () => {
    const nodeA = makeNode('node-a')
    const nodeB = makeNode('node-b')
    const edges: WorkflowEdge[] = [
      {
        sourceNodeId: 'node-a',
        targetNodeId: 'node-b',
        sourceOutputKey: 'text',
        targetParamLabel: 'input',
      },
    ]

    // Provider returns 600 KB output for nodeA; nodeB's merged context will exceed 512 KB.
    const largeText = 'x'.repeat(600 * 1024)
    const provider = makeTextProvider(() => largeText)

    const nodeStatuses: Record<string, string> = {}
    const ctx: WorkflowExecutionContext = makeCtx({
      runId: 'run-ctx-size',
      async onNodeStatusChange(nodeId, result) {
        nodeStatuses[nodeId] = result.status
      },
    })

    const service = new WorkflowExecutionService(provider)
    await service.executeWorkflow([nodeA, nodeB], edges, ctx)

    expect(nodeStatuses['node-a']).toBe('completed')
    expect(nodeStatuses['node-b']).toBe('failed')
  })
})

describe('budget halt via getBudgetSnapshot (Z10)', () => {
  it('cancels wave 2 nodes when snapshot signals budget_exceeded after wave 1 completes', async () => {
    // n1 → n2 (two-wave topology)
    const nodes: WorkflowNode[] = [makeNode('n1'), makeNode('n2')]
    const edges: WorkflowEdge[] = [
      {
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        sourceOutputKey: 'text',
        targetParamLabel: 'input',
      },
    ]

    let wave = 0
    // Return "ok" before wave 0 (let n1 run), "cancel" before wave 1 (block n2).
    const getBudgetSnapshot = vi.fn().mockImplementation((): BudgetSnapshot => {
      wave++
      if (wave === 1) {
        // Before wave 0: budget is fine
        return { spentCredits: 0, pendingCredits: 0, budgetCredits: 100 }
      }
      // Before wave 1: budget exhausted
      return { spentCredits: 200, pendingCredits: 0, budgetCredits: 100 }
    })

    const nodeStatuses: Record<string, string> = {}
    const ctx: WorkflowExecutionContext = makeCtx({
      runId: 'run-budget-halt',
      getBudgetSnapshot,
      async onNodeStatusChange(nodeId, result) {
        nodeStatuses[nodeId] = result.status
      },
    })

    const service = new WorkflowExecutionService(makeTextProvider())
    const result = await service.executeWorkflow(nodes, edges, ctx)

    // The run ends as cancelled (budget exceeded before wave 1)
    expect(result.status).toBe('cancelled')
    // n1 completed in wave 0
    expect(nodeStatuses['n1']).toBe('completed')
    // n2 was cancelled (never executed)
    expect(nodeStatuses['n2']).toBe('cancelled')
    // Budget was checked at least twice (before wave 0, before wave 1)
    expect(getBudgetSnapshot).toHaveBeenCalledTimes(2)
  })

  it('completes normally when getBudgetSnapshot returns null (no budget enforcement)', async () => {
    const nodes: WorkflowNode[] = [makeNode('only')]
    const service = new WorkflowExecutionService(makeTextProvider())
    const result = await service.executeWorkflow(
      nodes,
      [],
      makeCtx({ getBudgetSnapshot: () => null }),
    )
    expect(result.status).toBe('completed')
  })
})
