/**
 * OutputParserRunner — extract structured JSON fields from upstream LLM text.
 *
 * GRASP Information Expert: knows how to locate JSON in LLM output and
 * validate it against a declared schema (field list or JSON shape).
 *
 * Config schema (nodeConfig):
 *   fields?: string[] — list of field names to extract from parsed JSON
 *   jsonPath?: string — dot-path to the JSON block in upstream text (default: root)
 *   strict?: boolean — if true, fail when fields are missing (default: false)
 *
 * Security: no code execution. JSON.parse only.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

/**
 * Attempt to extract JSON from text — handles:
 * 1. Pure JSON text
 * 2. JSON in ```json code fences
 * 3. First { ... } or [ ... ] block in the text
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim()

  // Try direct parse
  try {
    return JSON.parse(trimmed)
  } catch { /* continue */ }

  // Try code fence extraction
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch { /* continue */ }
  }

  // Try first JSON object/array
  const objectMatch = trimmed.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0])
    } catch { /* continue */ }
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch { /* continue */ }
  }

  return undefined
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

export class OutputParserRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'output_parser'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const fields = ctx.nodeConfig['fields'] as string[] | undefined
    const jsonPath = ctx.nodeConfig['jsonPath'] as string | undefined
    const strict = ctx.nodeConfig['strict'] === true

    // Get upstream text
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const sourceText = firstUpstream?.text ?? ''

    if (!sourceText) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No upstream text to parse', parseError: true },
          durationMs: 0,
        },
      }
    }

    const parsed = extractJson(sourceText)
    if (parsed === undefined) {
      return {
        output: {
          mediaType: 'text',
          text: sourceText,
          data: { error: 'Failed to extract JSON from upstream text', parseError: true, rawText: sourceText.slice(0, 500) },
          durationMs: 0,
        },
      }
    }

    // Apply jsonPath if specified
    const target = jsonPath ? resolveDotPath(parsed, jsonPath) : parsed

    // Extract specific fields if declared
    if (fields && Array.isArray(fields) && fields.length > 0) {
      const extracted: Record<string, unknown> = {}
      const missing: string[] = []

      for (const field of fields) {
        const value = typeof target === 'object' && target !== null
          ? (target as Record<string, unknown>)[field]
          : undefined
        if (value !== undefined) {
          extracted[field] = value
        } else {
          missing.push(field)
        }
      }

      if (strict && missing.length > 0) {
        return {
          output: {
            mediaType: 'text',
            text: '',
            data: { error: `Missing required fields: ${missing.join(', ')}`, parseError: true, missing },
            durationMs: 0,
          },
        }
      }

      return {
        output: {
          mediaType: 'text',
          text: JSON.stringify(extracted),
          data: { ...extracted, __parsed: true, __missing: missing },
          durationMs: 0,
        },
      }
    }

    // Return full parsed object
    const data = typeof target === 'object' && target !== null && !Array.isArray(target)
      ? (target as Record<string, unknown>)
      : { value: target }

    return {
      output: {
        mediaType: 'text',
        text: JSON.stringify(target),
        data: { ...data, __parsed: true },
        durationMs: 0,
      },
    }
  }
}
