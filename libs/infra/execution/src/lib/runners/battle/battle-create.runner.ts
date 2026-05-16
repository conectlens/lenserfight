import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class BattleCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'battle_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — create a new battle instance from workflow config
    return {
      output: {
        mediaType: 'text',
        text: 'Battle created.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
