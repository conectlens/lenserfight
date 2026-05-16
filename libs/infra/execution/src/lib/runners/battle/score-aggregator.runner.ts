import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ScoreAggregatorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'score_aggregator'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — aggregate scores from judges and votes
    return {
      output: {
        mediaType: 'text',
        text: 'Scores aggregated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
