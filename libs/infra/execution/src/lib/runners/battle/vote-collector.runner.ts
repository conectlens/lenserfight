import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class VoteCollectorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'vote_collector'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — collect and tally votes for battle outcomes
    return {
      output: {
        mediaType: 'text',
        text: 'Votes collected.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
