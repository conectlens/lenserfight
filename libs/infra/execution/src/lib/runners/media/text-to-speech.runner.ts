import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class TextToSpeechRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_to_speech'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — synthesize speech audio from text input
    return {
      output: {
        mediaType: 'audio',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
