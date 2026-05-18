/**
 * LensExecuteRunner — executes a LenserFight Lens within a workflow.
 *
 * Architecture note: The WorkflowExecutionService resolves the lens template,
 * renders [[label]] placeholders, and validates inputs BEFORE calling this
 * runner. This runner receives the fully resolved prompt via `ctx.resolvedPrompt`
 * and delegates to the provider via `ctx.executeProvider`.
 *
 * Responsibilities (GRASP Information Expert):
 *   1. Build ExecutionInput from the resolved prompt + inferred attachments.
 *   2. Call the provider via ctx.executeProvider (closed over resolved model/provider).
 *   3. Enrich output metadata with lens context (lensId, versionId).
 *   4. Perform soft output contract validation — warnings only, not hard failure.
 *      (The engine also validates post-runner; this gives early diagnostic metadata.)
 */

import { validateOutput } from '../contract-validator'
import { inferAttachmentsFromRendered } from '../execution-attachments'

import type { ExecutionInput, ExecutionResult, WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'
import type { NodeOutputEnvelope } from '@lenserfight/types'

export class LensExecuteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'lens_execute'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const { resolvedPrompt, executeProvider, outputContract, nodeConfig, signal } = ctx

    // Fallback for test environments or when provider wiring is absent.
    // Returns the rendered prompt as text so downstream nodes still receive data.
    if (!resolvedPrompt || !executeProvider) {
      return {
        output: {
          mediaType: 'text',
          text: resolvedPrompt ?? '',
          data: { nodeId: ctx.nodeId, fallback: true },
          durationMs: 0,
        },
      }
    }

    // Check abort before provider call
    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    // Build execution input with optional multimodal attachments
    const attachments = inferAttachmentsFromRendered(ctx.resolvedParams)
    const input: ExecutionInput = {
      prompt: resolvedPrompt,
      params: { ...ctx.resolvedParams },
      ...(attachments.length > 0 ? { attachments } : {}),
    }

    // Call provider (provider + model already resolved by engine closure)
    const result: ExecutionResult = await executeProvider(input)

    // Soft output contract validation — attach warnings to metadata
    // without failing the node. The engine does hard validation separately.
    if (outputContract) {
      const envelope = buildLightEnvelope(result, outputContract)
      const check = validateOutput(envelope, outputContract)
      if (!check.ok) {
        result.metadata = {
          ...(result.metadata ?? {}),
          contractWarnings: check.errors,
        }
      }
    }

    // Enrich metadata with lens execution context
    result.metadata = {
      ...(result.metadata ?? {}),
      lensId: nodeConfig['lensId'] ?? nodeConfig['lens_id'] ?? null,
      versionId: nodeConfig['versionId'] ?? nodeConfig['version_id'] ?? null,
      executedBy: 'lens_execute_runner',
    }

    return { output: result }
  }
}

/**
 * Lightweight envelope construction for contract validation inside the runner.
 * Only used for diagnostic warnings — the engine constructs the real envelope.
 */
function buildLightEnvelope(
  result: ExecutionResult,
  outputContract: { kind?: string; artifactKind?: string },
): NodeOutputEnvelope {
  const kind = outputContract.kind ?? (result.mediaType === 'image' ? 'image' : 'text')
  const artifactKind = outputContract.artifactKind ?? result.mediaType
  return {
    kind: kind as NodeOutputEnvelope['kind'],
    artifactKind: artifactKind as NodeOutputEnvelope['artifactKind'],
    output: result.text ?? result.url ?? '',
    data: result.data,
    media: result.url ? { url: result.url, mime: result.mimeType ?? null, width: null, height: null, durationS: null, bytes: null } : null,
    metadata: result.metadata,
  }
}
