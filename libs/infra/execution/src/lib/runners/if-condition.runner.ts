/**
 * IfConditionRunner — two-way conditional branch node.
 *
 * GRASP Information Expert: this runner evaluates a single condition against
 * upstream output and decides whether the "true" or "false" branch activates.
 *
 * Config schema (nodeConfig):
 *   operator: IfOperator — whitelisted comparator (mirrors SwitchRunner)
 *   value?: unknown — the expected comparison value
 *   inputPath?: string — dot-path to extract the comparison value from upstream
 *   expression?: string — dot-path within the resolved source value
 *
 * Security:
 * - No eval() or Function(). Conditions use the same whitelisted comparators
 *   as SwitchRunner.
 *
 * Output / routing:
 * - output.data.branch: 'true' | 'false' — the chosen branch label.
 * - variableMutations.__if_branch: same value, merged into rootInputs.
 *
 * The engine routes the chosen branch via per-edge conditions: a downstream
 * edge sets `sourceOutputKey: 'branch'` + `condition: { type: 'equals',
 * value: 'true' | 'false' }`. `isEdgeConditionSatisfied` reads the source
 * node's `output.data.branch` so only the matching branch receives input.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export type IfOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'regex_match'
  | 'is_empty'
  | 'is_not_empty'

function evaluateCondition(input: unknown, operator: IfOperator, expected: unknown): boolean {
  switch (operator) {
    case 'equals':
      return String(input) === String(expected)
    case 'not_equals':
      return String(input) !== String(expected)
    case 'contains':
      return typeof input === 'string' && typeof expected === 'string' && input.includes(expected)
    case 'not_contains':
      return typeof input === 'string' && typeof expected === 'string' && !input.includes(expected)
    case 'greater_than':
      return Number(input) > Number(expected)
    case 'less_than':
      return Number(input) < Number(expected)
    case 'regex_match': {
      if (typeof input !== 'string' || typeof expected !== 'string') return false
      try {
        return new RegExp(expected).test(input)
      } catch {
        return false
      }
    }
    case 'is_empty':
      return input === '' || input === null || input === undefined
    case 'is_not_empty':
      return input !== '' && input !== null && input !== undefined
    default:
      return false
  }
}

function resolveDotPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const segments = path.replace(/\[(\d+)]/g, '.$1').split('.').filter(Boolean)
  let current: unknown = obj
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

export class IfConditionRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'if_condition'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const operator = (ctx.nodeConfig['operator'] as IfOperator) ?? 'is_not_empty'
    const expected = ctx.nodeConfig['value']
    const inputPath = ctx.nodeConfig['inputPath'] as string | undefined
    const expression = ctx.nodeConfig['expression'] as string | undefined

    // Read comparison source from the first upstream (mirrors SwitchRunner).
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    let sourceValue: unknown
    if (firstUpstream) {
      const dataSource =
        firstUpstream.data ?? (firstUpstream.text ? tryParseJson(firstUpstream.text) : undefined)
      if (inputPath) {
        sourceValue = resolveDotPath(dataSource ?? firstUpstream.text, inputPath)
      } else {
        sourceValue = dataSource ?? firstUpstream.text
      }
    }

    const testValue = expression ? resolveDotPath(sourceValue, expression) : sourceValue
    const matched = evaluateCondition(testValue, operator, expected)
    const branch = matched ? 'true' : 'false'

    return {
      output: {
        mediaType: 'text',
        text: `Condition evaluated: ${branch}`,
        data: { nodeId: ctx.nodeId, branch, matched },
        durationMs: 0,
      },
      variableMutations: { __if_branch: branch },
    }
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
