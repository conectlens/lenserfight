import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class GithubIssueCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'github_issue_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — create GitHub issue with title, body, labels, and assignees
    return {
      output: {
        mediaType: 'text',
        data: { number: 0, url: '', title: '', nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
