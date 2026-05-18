/**
 * SwitchRunner — multi-way conditional branch node.
 *
 * GRASP Information Expert: this runner evaluates match conditions against
 * upstream output and determines which output branch(es) should activate.
 *
 * Config schema (nodeConfig):
 *   cases: Array<{ label: string; expression: string; operator: SwitchOperator; value: unknown }>
 *   defaultBranch?: string — label of the fallback branch (defaults to "default")
 *   inputPath?: string — dot-path to extract the comparison value from upstream
 *
 * Security:
 * - No eval() or Function(). Conditions are evaluated with simple comparators.
 * - Operator set is explicitly whitelisted.
 *
 * Output:
 * - output.data.matchedBranch: string — the label of the first matching branch
 * - output.data.matchedIndex: number — index of the matched case (-1 for default)
 * - variableMutations: { __switch_branch: string } — engine uses this to route edges
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export type SwitchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'regex_match'
  | 'is_empty'
  | 'is_not_empty'

export interface SwitchCase {
  label: string
  expression: string
  operator: SwitchOperator
  value: unknown
}

function evaluateCondition(input: unknown, operator: SwitchOperator, expected: unknown): boolean {
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

export class SwitchRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'switch'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const cases = ctx.nodeConfig['cases'] as SwitchCase[] | undefined
    const defaultBranch = (ctx.nodeConfig['defaultBranch'] as string) ?? 'default'
    const inputPath = ctx.nodeConfig['inputPath'] as string | undefined

    if (!cases || !Array.isArray(cases) || cases.length === 0) {
      return {
        output: {
          mediaType: 'text',
          text: `Switch routed to: ${defaultBranch} (no cases configured)`,
          data: { matchedBranch: defaultBranch, matchedIndex: -1 },
          durationMs: 0,
        },
        variableMutations: { __switch_branch: defaultBranch },
      }
    }

    // Get comparison source from upstream
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    let sourceValue: unknown
    if (firstUpstream) {
      // Prefer structured data for expression evaluation; fall back to parsed text
      const dataSource = firstUpstream.data ?? (firstUpstream.text ? tryParseJson(firstUpstream.text) : undefined)
      if (inputPath) {
        sourceValue = resolveDotPath(dataSource ?? firstUpstream.text, inputPath)
      } else {
        // Keep structured data as-is so case expressions can traverse it.
        // Plain text is used when no structured data exists.
        sourceValue = dataSource ?? firstUpstream.text
      }
    }

    // Evaluate cases in order — first match wins
    for (let i = 0; i < cases.length; i++) {
      const switchCase = cases[i]
      const testValue = switchCase.expression
        ? resolveDotPath(sourceValue, switchCase.expression)
        : sourceValue

      if (evaluateCondition(testValue, switchCase.operator, switchCase.value)) {
        return {
          output: {
            mediaType: 'text',
            text: `Switch routed to: ${switchCase.label}`,
            data: { matchedBranch: switchCase.label, matchedIndex: i },
            durationMs: 0,
          },
          variableMutations: { __switch_branch: switchCase.label },
        }
      }
    }

    // No match — use default
    return {
      output: {
        mediaType: 'text',
        text: `Switch routed to: ${defaultBranch}`,
        data: { matchedBranch: defaultBranch, matchedIndex: -1 },
        durationMs: 0,
      },
      variableMutations: { __switch_branch: defaultBranch },
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
