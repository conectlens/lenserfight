import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class FormInputTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'form_input_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — collect and validate form input data
    return {
      output: {
        mediaType: 'text',
        text: 'Form input trigger activated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
