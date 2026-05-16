import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class SpeechToTextRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'speech_to_text'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — transcribe speech audio to text
    return {
      output: {
        mediaType: 'text',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
