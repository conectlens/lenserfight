import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class CalendarCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'calendar_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — create event in Google Calendar
    return {
      output: {
        mediaType: 'text',
        data: { id: '', link: '', summary: '', nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
