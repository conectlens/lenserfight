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
          data: { error: 'Missing event summary' },
          durationMs: 0,
        },
      }
    }

    if (!startTime || !endTime) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'Missing startTime or endTime (ISO 8601 format required)' },
          durationMs: 0,
        },
      }
    }

    // Resolve OAuth token for Google Calendar
    let accessToken: string | null = null
    if (connectorRef && ctx.resolveConnector) {
      accessToken = await ctx.resolveConnector(connectorRef, CALENDAR_REQUIRED_SCOPES)
      if (!accessToken) {
        return {
          output: {
            mediaType: 'text',
            text: '',
            data: {
              error: 'connector_not_resolved',
              detail: `Could not resolve connector: ${connectorRef}. Ensure a Google Calendar connection is active at /settings/connections.`,
            },
            durationMs: 0,
          },
        }
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
          // accessToken included for worker; never logged or returned to frontend
          ...(accessToken ? { __oauth_access_token: accessToken } : {}),
        },
        durationMs: 0,
      },
    }
  }
}
