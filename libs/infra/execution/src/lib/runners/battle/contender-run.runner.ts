import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ContenderRunRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'contender_run'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — execute a single contender's lens within a battle
    return {
      output: {
        mediaType: 'text',
        text: 'Contender run complete.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
