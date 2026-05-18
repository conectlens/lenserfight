import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class AudioTranscribeRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'audio_transcribe'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — transcribe audio file to text
    return {
      output: {
        mediaType: 'text',
        text: 'Audio transcribed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
