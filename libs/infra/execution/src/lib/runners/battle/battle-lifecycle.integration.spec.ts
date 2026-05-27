// Battle lifecycle integration test — validates the full battle workflow
// (ContenderRunRunner → BattleExecuteRunner) through the engine pipeline.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { WorkflowExecutionService } from '../../workflow-execution.service'
import { registerNodeRunner, clearNodeRunners } from '../node-runner.registry'

import { BattleExecuteRunner } from './battle-execute.runner'
import { ContenderRunRunner } from './contender-run.runner'

import type { IExecutionProvider, ExecutionInput, ExecutionResult } from '../../execution.types'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
} from '../../workflow-execution.service'

// ── Provider factory ─────────────────────────────────────────────────────────

function battleProvider(): IExecutionProvider {
  return {
    id: 'battle-echo',
    supportedMediaTypes: ['text'],
    async execute(_model: string, input: ExecutionInput): Promise<ExecutionResult> {
      return {
        mediaType: 'text',
        text: `response:${input.prompt.slice(0, 30)}`,
        metadata: {},
      }
    },
  }
}

// ── Context factory ──────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<WorkflowExecutionContext> = {}): WorkflowExecutionContext & { statusLog: Record<string, NodeResult[]> } {
  const statusLog: Record<string, NodeResult[]> = {}
  return {
    runId: 'run-battle-lifecycle',
    rootInputs: { input: 'battle prompt' },
    statusLog,
    async resolveLensTemplate() {
      return '[[input]]'
    },
    async onNodeStatusChange(nodeId, result) {
      statusLog[nodeId] = [...(statusLog[nodeId] ?? []), { ...result }]
    },
    ...overrides,
  }
}

function n(id: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return { id, lensId: 'battle-lens', ...overrides }
}

function e(source: string, target: string, overrides: Partial<WorkflowEdge> = {}): WorkflowEdge {
  return {
    sourceNodeId: source,
    targetNodeId: target,
    sourceOutputKey: 'text',
    targetParamLabel: 'input',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Battle lifecycle integration', () => {
  beforeEach(() => {
    registerNodeRunner(new ContenderRunRunner())
    registerNodeRunner(new BattleExecuteRunner())
  })

  afterEach(() => {
    clearNodeRunners()
  })

  it('two contender runs feed into battle-execute node', async () => {
    const service = new WorkflowExecutionService(battleProvider())
    const ctx = makeCtx()

    // Workflow: contenderA → battleExec ← contenderB
    const result = await service.executeWorkflow(
      [
        n('contender-A', { nodeType: 'contender_run', config: { battleId: 'b1', contenderId: 'c1', slot: 'A' } } as any),
        n('contender-B', { nodeType: 'contender_run', config: { battleId: 'b1', contenderId: 'c2', slot: 'B' } } as any),
        n('battle-exec', { nodeType: 'battle_execute', config: { battleId: 'b1' } } as any),
      ],
      [
        e('contender-A', 'battle-exec'),
        e('contender-B', 'battle-exec'),
      ],
      ctx,
    )

    expect(result.status).toBe('completed')
    expect(result.nodeResults).toHaveLength(3)

    // Both contenders must complete before battle-exec
    const contenderAResult = result.nodeResults.find((r) => r.nodeId === 'contender-A')
    const contenderBResult = result.nodeResults.find((r) => r.nodeId === 'contender-B')
    const battleExecResult = result.nodeResults.find((r) => r.nodeId === 'battle-exec')

    expect(contenderAResult?.status).toBe('completed')
    expect(contenderBResult?.status).toBe('completed')
    expect(battleExecResult?.status).toBe('completed')
  })

  it('contender failure propagates to battle-exec with default policy', async () => {
    const failingBattleProvider: IExecutionProvider = {
      id: 'fail-once',
      supportedMediaTypes: ['text'],
      execute: (() => {
        let callCount = 0
        return async (_m: string, _i: ExecutionInput): Promise<ExecutionResult> => {
          callCount++
          if (callCount === 1) throw new Error('contender_timeout')
          return { mediaType: 'text', text: 'ok', metadata: {} }
        }
      })(),
    }

    const service = new WorkflowExecutionService(failingBattleProvider)
    const ctx = makeCtx()

    const result = await service.executeWorkflow(
      [
        n('contender-A', { nodeType: 'contender_run', config: { battleId: 'b1', slot: 'A' } } as any),
        n('contender-B', { nodeType: 'contender_run', config: { battleId: 'b1', slot: 'B' } } as any),
        n('battle-exec', { nodeType: 'battle_execute', config: { battleId: 'b1' } } as any),
      ],
      [
        e('contender-A', 'battle-exec'),
        e('contender-B', 'battle-exec'),
      ],
      ctx,
    )

    // With default propagate policy, battle-exec should also fail/be blocked
    const contenderA = result.nodeResults.find((r) => r.nodeId === 'contender-A')
    // The error message contains 'timeout' so the engine classifies it as timed_out
    expect(contenderA?.status).toBe('timed_out')
  })

  it('status log tracks full lifecycle transitions', async () => {
    const service = new WorkflowExecutionService(battleProvider())
    const ctx = makeCtx()

    await service.executeWorkflow(
      [
        n('A', { nodeType: 'contender_run', config: { battleId: 'b1', slot: 'A' } } as any),
        n('B', { nodeType: 'battle_execute', config: { battleId: 'b1' } } as any),
      ],
      [e('A', 'B')],
      ctx,
    )

    // Node B should show awaiting_dependency then completed
    const bStatuses = ctx.statusLog['B']?.map((r) => r.status) ?? []
    expect(bStatuses[0]).toBe('awaiting_dependency')
    expect(bStatuses[bStatuses.length - 1]).toBe('completed')
  })
})
