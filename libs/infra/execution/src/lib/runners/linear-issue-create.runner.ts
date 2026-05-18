import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class LinearIssueCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'linear_issue_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined
    const teamId = ctx.nodeConfig['teamId'] as string | undefined
    const title = ctx.nodeConfig['title'] as string | undefined
    const description = ctx.nodeConfig['description'] as string | undefined
    const priority = Number(ctx.nodeConfig['priority'] ?? 2)

    if (!teamId || !title?.trim()) {
      return { output: { mediaType: 'json', text: '', data: { error: 'Missing teamId or title', nodeId: ctx.nodeId }, durationMs: 0 } }
    }

    if (connectorRef && ctx.executeConnectorOperation) {
      return {
        output: await ctx.executeConnectorOperation({
          connectorRef,
          provider: 'linear',
          capability: 'issues',
          operation: 'create_issue',
          requiredScopes: ['linear:write'],
          params: { teamId, title: title.trim(), description: description ?? '', priority },
        }),
      }
    }

    return {
      output: {
        mediaType: 'json',
        text: `[Linear issue: ${title.trim()}]`,
        data: { identifier: '', url: '', title: title.trim(), teamId, nodeId: ctx.nodeId, mock: true },
        durationMs: 0,
      },
    }
  }
}
