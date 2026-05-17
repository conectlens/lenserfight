/**
 * TextToSpeechRunner — delegates text-to-speech synthesis to `ctx.executeProvider`.
 *
 * Config schema (nodeConfig):
 *   voiceId?: string  — provider-specific voice ID
 *   format?:  string  — 'mp3' | 'wav' | 'opus' (default: 'mp3')
 */

import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class TextToSpeechRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_to_speech'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { resolvedPrompt, executeProvider, nodeConfig, signal } = ctx

    if (!resolvedPrompt || !executeProvider) {
      return {
        output: {
          mediaType: 'audio',
          data: {
            nodeId:   ctx.nodeId,
            fallback: true,
            error:    !resolvedPrompt ? 'text_to_speech: resolvedPrompt is required' : 'text_to_speech: no provider wired',
          },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const speechParams: Record<string, unknown> = {}
    if (nodeConfig['voiceId']) speechParams['voice_id'] = nodeConfig['voiceId']
    if (nodeConfig['format'])  speechParams['format']   = nodeConfig['format']

    const input: ExecutionInput = {
      prompt: resolvedPrompt,
      ...(Object.keys(speechParams).length > 0 ? { params: speechParams } : {}),
    }

    const result = await executeProvider(input)

    return {
      output: {
        ...result,
        mediaType:  'audio',
        durationMs: Date.now() - startedAt,
        metadata: {
          ...(result.metadata ?? {}),
          executedBy: 'text_to_speech_runner',
        },
      },
    }
  }
}
