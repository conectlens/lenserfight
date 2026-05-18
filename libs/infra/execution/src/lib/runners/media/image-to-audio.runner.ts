/**
 * ImageToAudioRunner — generates audio from an upstream image via multimodal provider.
 *
 * Extracts the upstream image URL, passes it as an image attachment, and returns
 * audio output (e.g. ambient soundscape, description narration).
 */

import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ImageToAudioRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'image_to_audio'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { resolvedPrompt, executeProvider, signal } = ctx

    if (!executeProvider) {
      return {
        output: {
          mediaType: 'audio',
          data: { nodeId: ctx.nodeId, fallback: true, error: 'image_to_audio: no provider wired' },
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
      throw new Error('image_to_audio: no upstream image URL found in upstreamOutputs')
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
        mediaType:  'audio',
        durationMs: Date.now() - startedAt,
        metadata: {
          ...(result.metadata ?? {}),
          sourceImageUrl: imageUrl,
          executedBy:     'image_to_audio_runner',
        },
      },
    }
  }
}
