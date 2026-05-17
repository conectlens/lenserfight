/**
 * TextToVideoRunner — delegates text-to-video generation to `ctx.executeProvider`.
 *
 * Async providers (Kling, FAL) return a taskId in `result.data.taskId` instead
 * of a URL. The runner surfaces this in output.data so the poll-async-executions
 * edge function can finalise the URL later.
 *
 * Config schema (nodeConfig):
 *   aspectRatio?:  string  — e.g. '16:9' | '9:16'
 *   durationSecs?: number  — requested clip length in seconds
 */

import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class TextToVideoRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_to_video'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { resolvedPrompt, executeProvider, nodeConfig, signal } = ctx

    if (!resolvedPrompt || !executeProvider) {
      return {
        output: {
          mediaType: 'video',
          data: {
            nodeId:   ctx.nodeId,
            fallback: true,
            error:    !resolvedPrompt ? 'text_to_video: resolvedPrompt is required' : 'text_to_video: no provider wired',
          },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const videoParams: Record<string, unknown> = {}
    if (nodeConfig['aspectRatio'])  videoParams['aspect_ratio']   = nodeConfig['aspectRatio']
    if (nodeConfig['durationSecs']) videoParams['duration_secs']  = nodeConfig['durationSecs']

    const input: ExecutionInput = {
      prompt: resolvedPrompt,
      ...(Object.keys(videoParams).length > 0 ? { params: videoParams } : {}),
    }

    const result = await executeProvider(input)

    return {
      output: {
        ...result,
        mediaType:  'video',
        durationMs: Date.now() - startedAt,
        metadata: {
          ...(result.metadata ?? {}),
          executedBy: 'text_to_video_runner',
        },
      },
    }
  }
}
