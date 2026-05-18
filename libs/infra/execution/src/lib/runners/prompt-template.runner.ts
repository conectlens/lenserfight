/**
 * PromptTemplateRunner — compose dynamic prompts from a Handlebars-style
 * template with variable bindings from upstream outputs and resolved params.
 *
 * GRASP Information Expert: knows how to interpolate template variables
 * against the execution context and produce a ready-to-use prompt string.
 *
 * Config schema (nodeConfig):
 *   template: string — Handlebars-style template (uses {{variable}} syntax)
 *   variables?: Record<string, string> — explicit variable→source mappings
 *
 * Security:
 * - No code execution. Only string interpolation.
 * - Template helpers ({{#if}}, {{#each}}) are NOT supported — keep it simple.
 * - Max template length: 50,000 characters.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_TEMPLATE_LENGTH = 50_000
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g

function resolveVariable(path: string, context: Record<string, unknown>): string {
  const trimmed = path.trim()
  const segments = trimmed.replace(/\[(\d+)]/g, '.$1').split('.').filter(Boolean)

  let current: unknown = context
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[seg]
  }

  if (current === null || current === undefined) return ''
  if (typeof current === 'object') return JSON.stringify(current)
  return String(current)
}

export class PromptTemplateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'prompt_template'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const template = ctx.nodeConfig['template'] as string | undefined

    if (!template || typeof template !== 'string') {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No template configured' },
          durationMs: 0,
        },
      }
    }

    if (template.length > MAX_TEMPLATE_LENGTH) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: `Template exceeds maximum length of ${MAX_TEMPLATE_LENGTH}` },
          durationMs: 0,
        },
      }
    }

    // Build merged context: resolvedParams + flattened upstream outputs
    const mergedContext: Record<string, unknown> = { ...ctx.resolvedParams }

    // Add upstream outputs keyed by nodeId
    for (const [nodeId, result] of ctx.upstreamOutputs) {
      mergedContext[nodeId] = result.data ?? result.text ?? result.url
      // Also expose .text and .data directly
      mergedContext[`${nodeId}_text`] = result.text ?? ''
      mergedContext[`${nodeId}_data`] = result.data ?? {}
    }

    // Apply explicit variable mappings if provided
    const variables = ctx.nodeConfig['variables'] as Record<string, string> | undefined
    if (variables && typeof variables === 'object') {
      for (const [key, sourcePath] of Object.entries(variables)) {
        mergedContext[key] = resolveVariable(sourcePath, mergedContext)
      }
    }

    // Render template
    const rendered = template.replace(VARIABLE_PATTERN, (_match, path: string) => {
      return resolveVariable(path, mergedContext)
    })

    return {
      output: {
        mediaType: 'text',
        text: rendered,
        data: { renderedLength: rendered.length, variableCount: (template.match(VARIABLE_PATTERN) ?? []).length },
        durationMs: 0,
      },
    }
  }
}
