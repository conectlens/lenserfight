/**
 * SpeechToTextRunner — transcribes upstream audio to text via `ctx.executeProvider`.
 *
 * Extracts the upstream audio URL from upstreamOutputs (first entry with
 * mediaType: 'audio' and a url), passes it as an audio attachment to the
 * provider, and returns a text transcript.
 */

import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class SpeechToTextRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'speech_to_text'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { executeProvider, signal } = ctx

    if (!executeProvider) {
      return {
        output: {
          mediaType: 'text',
          text:      '',
          data: { nodeId: ctx.nodeId, fallback: true, error: 'speech_to_text: no provider wired' },
          durationMs: 0,
        },
      }
    }

    // Extract upstream audio URL (first upstream with mediaType 'audio' and a url).
    let audioUrl: string | undefined
    for (const output of ctx.upstreamOutputs.values()) {
      if (output.mediaType === 'audio' && output.url) {
        audioUrl = output.url
        break
      }
    }

    if (!audioUrl) {
      throw new Error('speech_to_text: no upstream audio URL found in upstreamOutputs')
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const input: ExecutionInput = {
      prompt:      '',
      attachments: [{ kind: 'audio', url: audioUrl }],
    }

    const result = await executeProvider(input)

    return {
      output: {
        ...result,
        mediaType:  'text',
        durationMs: Date.now() - startedAt,
        metadata: {
          ...(result.metadata ?? {}),
          sourceAudioUrl: audioUrl,
          executedBy:     'speech_to_text_runner',
        },
      },
    }
  }
}
