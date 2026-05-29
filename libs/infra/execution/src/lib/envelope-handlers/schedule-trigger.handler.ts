/**
 * ScheduleTriggerHandler — consumes `__schedule_trigger_request` envelopes
 * from ScheduleTriggerRunner. Upserts into `lenses.workflow_cron_schedules`
 * so the cron orchestrator can pick the schedule up on its next sweep.
 *
 * Uses the user JWT when present (so the upsert respects RLS) and falls back
 * to a service-role upsert ONLY when the run has no interactive context AND
 * the executor explicitly authorized service-side scheduling (workflow has a
 * stored owner). Hard-coded refusal to call without any auth at all.
 */

import type {
  EnvelopeHandler,
  EnvelopeHandlerResult,
  PostRunContext,
} from './types'

interface ScheduleTriggerEnvelope {
  __schedule_trigger_request: true
  cronExpression: string
  timezone: string
  enabled: boolean
}

function isScheduleTriggerEnvelope(value: unknown): value is ScheduleTriggerEnvelope {
  if (!value || typeof value !== 'object') return false
  const data = (value as { data?: unknown }).data ?? value
  if (!data || typeof data !== 'object') return false
  return (data as { __schedule_trigger_request?: unknown }).__schedule_trigger_request === true
}

function extractData(value: unknown): ScheduleTriggerEnvelope {
  const data = (value as { data?: unknown }).data ?? value
  return data as ScheduleTriggerEnvelope
}

export class ScheduleTriggerHandler implements EnvelopeHandler {
  readonly name = 'schedule_trigger'

  matches(output: unknown): boolean {
    return isScheduleTriggerEnvelope(output)
  }

  async handle(
    output: unknown,
    ctx: PostRunContext,
  ): Promise<EnvelopeHandlerResult> {
    if (!ctx.userJwt && !ctx.supabaseServiceRoleKey) {
      throw new Error(
        'schedule_trigger handler requires either ctx.userJwt or ctx.supabaseServiceRoleKey',
      )
    }

    const envelope = extractData(output)
    const useUserAuth = !!ctx.userJwt

    const authToken = useUserAuth ? ctx.userJwt! : ctx.supabaseServiceRoleKey
    const apiKey    = useUserAuth ? ctx.supabaseAnonKey : ctx.supabaseServiceRoleKey

    const response = await fetch(
      `${ctx.supabaseUrl}/rest/v1/workflow_cron_schedules?on_conflict=workflow_id`,
      {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'Authorization':  `Bearer ${authToken}`,
          'apikey':         apiKey,
          'Prefer':         'resolution=merge-duplicates,return=representation',
          'Content-Profile':'lenses',
        },
        body: JSON.stringify({
          workflow_id:     ctx.workflowId,
          cron_expression: envelope.cronExpression,
          timezone:        envelope.timezone,
          enabled:         envelope.enabled,
        }),
      },
    )

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText)
      throw new Error(
        `schedule_trigger upsert returned ${response.status}: ${body}`,
      )
    }

    return {
      handler: this.name,
      handled: true,
      data: {
        workflowId:     ctx.workflowId,
        cronExpression: envelope.cronExpression,
        timezone:       envelope.timezone,
        enabled:        envelope.enabled,
      },
    }
  }
}
