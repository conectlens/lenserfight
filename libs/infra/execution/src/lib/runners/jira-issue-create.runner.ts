import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class JiraIssueCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'jira_issue_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — create Jira issue with project, type, priority, and custom fields
    return {
      output: {
        mediaType: 'text',
        data: { key: '', url: '', summary: '', nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
