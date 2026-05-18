/**
 * ImageToImageRunner — applies image transformation via `ctx.executeProvider`.
 *
 * GRASP Information Expert: extracts the upstream image URL from upstreamOutputs
 * (first entry with mediaType: 'image'), then delegates style transfer or
 * img2img generation to the provider.
 *
 * Throws before the provider call if no upstream image is available, so the
 * engine's error handling surfaces a clear diagnostic rather than a provider
 * error about a missing input.
 */

import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ImageToImageRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'image_to_image'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { resolvedPrompt, executeProvider, signal } = ctx

    if (!executeProvider) {
      return {
        output: {
          mediaType: 'image',
          data: { nodeId: ctx.nodeId, fallback: true, error: 'image_to_image: no provider wired' },
          durationMs: 0,
        },
      }
    }

    // Extract upstream image URL (first upstream with mediaType 'image' and a url).
    let imageUrl: string | undefined
    for (const output of ctx.upstreamOutputs.values()) {
      if (output.mediaType === 'image' && output.url) {
        imageUrl = output.url
        break
      }
    }

    if (!imageUrl) {
      throw new Error('image_to_image: no upstream image URL found in upstreamOutputs')
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const input: ExecutionInput = {
      prompt:      resolvedPrompt ?? '',
      attachments: [{ kind: 'image', url: imageUrl }],
    }

    const result = await executeProvider(input)

    return {
      output: {
        ...result,
        mediaType:  'image',
        durationMs: Date.now() - startedAt,
        metadata: {
          ...(result.metadata ?? {}),
          sourceImageUrl: imageUrl,
          executedBy:     'image_to_image_runner',
        },
      },
    }
  }
}
