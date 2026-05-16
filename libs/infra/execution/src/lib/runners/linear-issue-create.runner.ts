import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class LinearIssueCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'linear_issue_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — create Linear issue with project, team, and priority
    return {
      output: {
        mediaType: 'text',
        data: { identifier: '', url: '', title: '', nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
