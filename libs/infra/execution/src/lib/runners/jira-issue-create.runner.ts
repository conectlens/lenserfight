import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class JiraIssueCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'jira_issue_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined
    const projectKey = ctx.nodeConfig['projectKey'] as string | undefined
    const issueType = (ctx.nodeConfig['issueType'] as string | undefined) ?? 'Task'
    const summary = ctx.nodeConfig['summary'] as string | undefined
    const description = ctx.nodeConfig['description'] as string | undefined
    const priority = ctx.nodeConfig['priority'] as string | undefined

    if (!projectKey || !/^[A-Z][A-Z0-9_]{1,15}$/.test(projectKey)) {
      return { output: { mediaType: 'json', text: '', data: { error: 'Invalid Jira projectKey', nodeId: ctx.nodeId }, durationMs: 0 } }
    }
    if (!summary?.trim()) {
      return { output: { mediaType: 'json', text: '', data: { error: 'Missing Jira summary', nodeId: ctx.nodeId }, durationMs: 0 } }
    }

    if (connectorRef && ctx.executeConnectorOperation) {
      return {
        output: await ctx.executeConnectorOperation({
          connectorRef,
          provider: 'jira',
          capability: 'issues',
          operation: 'create_issue',
          requiredScopes: ['write:jira-work'],
          params: { projectKey, issueType, summary: summary.trim(), description: description ?? '', priority: priority ?? 'Medium' },
        }),
      }
    }

    return {
      output: {
        mediaType: 'json',
        text: `[Jira issue: ${projectKey}]`,
        data: { key: '', url: '', summary: summary.trim(), projectKey, nodeId: ctx.nodeId, mock: true },
        durationMs: 0,
      },
    }
  }
}
