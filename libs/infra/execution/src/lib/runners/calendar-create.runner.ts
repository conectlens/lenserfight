import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const CALENDAR_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

export class CalendarCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'calendar_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const summary = ctx.nodeConfig['summary'] as string | undefined
    const startTime = ctx.nodeConfig['startTime'] as string | undefined
    const endTime = ctx.nodeConfig['endTime'] as string | undefined
    const calendarId = (ctx.nodeConfig['calendarId'] as string | undefined) ?? 'primary'
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined
    const description = ctx.nodeConfig['description'] as string | undefined

    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'Missing event summary', nodeId: ctx.nodeId },
          durationMs: 0,
        },
      }
    }

    if (!startTime || !endTime) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'Missing startTime or endTime (ISO 8601 format required)', nodeId: ctx.nodeId },
          durationMs: 0,
        },
      }
    }

    if (connectorRef && ctx.executeConnectorOperation) {
      return {
        output: await ctx.executeConnectorOperation({
          connectorRef,
          provider: 'google',
          capability: 'calendar',
          operation: 'create_event',
          requiredScopes: CALENDAR_REQUIRED_SCOPES,
          params: {
            calendarId,
            summary: summary.trim(),
            description: description ?? null,
            startTime,
            endTime,
          },
        }),
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Calendar Event: ${summary}]`,
        data: {
          __calendar_create_request: true,
          calendarId,
          summary: summary.trim(),
          description: description ?? null,
          startTime,
          endTime,
          connectorRef: connectorRef ?? null,
          mock: true,
        },
        durationMs: 0,
      },
    }
  }
}
