/**
 * ImageUpscaleRunner — upscales an upstream image via super-resolution provider.
 *
 * Extracts the upstream image URL and delegates to the provider with the
 * source image as an attachment. Returns the upscaled image URL.
 *
 * Config schema (nodeConfig):
 *   scale?: number — upscale factor (e.g. 2, 4). Provider-dependent default.
 */

import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ImageUpscaleRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'image_upscale'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { executeProvider, nodeConfig, signal } = ctx

    if (!executeProvider) {
      return {
        output: {
          mediaType: 'image',
          data: { nodeId: ctx.nodeId, fallback: true, error: 'image_upscale: no provider wired' },
          durationMs: 0,
        },
      }
    }

    let imageUrl: string | undefined
    for (const output of ctx.upstreamOutputs.values()) {
      if (output.mediaType === 'image' && output.url) {
        imageUrl = output.url
        break
      }
    }

    if (!imageUrl) {
      throw new Error('image_upscale: no upstream image URL found in upstreamOutputs')
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const upscaleParams: Record<string, unknown> = {}
    if (nodeConfig['scale']) upscaleParams['scale'] = nodeConfig['scale']

    const input: ExecutionInput = {
      prompt:      '',
      attachments: [{ kind: 'image', url: imageUrl }],
      ...(Object.keys(upscaleParams).length > 0 ? { params: upscaleParams } : {}),
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
          executedBy:     'image_upscale_runner',
        },
      },
    }
  }
}
