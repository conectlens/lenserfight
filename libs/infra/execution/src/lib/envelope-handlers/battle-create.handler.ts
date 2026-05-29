/**
 * BattleCreateHandler — consumes `__battle_create_request` envelopes from
 * BattleCreateRunner. Calls fn_battles_create with the user's JWT so the
 * SECURITY DEFINER `get_auth_lenser_id()` inside the RPC resolves correctly,
 * then logs the created battle to `lenses.workflow_battle_run_log`.
 *
 * Security: rejects if `ctx.userJwt` is missing. Never falls back to the
 * service-role key — that would let any workflow create a battle owned by an
 * arbitrary user.
 */

import type {
  EnvelopeHandler,
  EnvelopeHandlerResult,
  PostRunContext,
} from './types'

interface BattleCreateEnvelope {
  __battle_create_request: true
  title: string
  taskPrompt: string
  battleType: string
  voterEligibility?: string
  workflowId?: string
  lensId?: string
  handicapConfig?: Record<string, unknown>
}

function isBattleCreateEnvelope(value: unknown): value is BattleCreateEnvelope {
  if (!value || typeof value !== 'object') return false
  const data = (value as { data?: unknown }).data ?? value
  if (!data || typeof data !== 'object') return false
  return (data as { __battle_create_request?: unknown }).__battle_create_request === true
}

function extractData(value: unknown): BattleCreateEnvelope {
  const data = (value as { data?: unknown }).data ?? value
  return data as BattleCreateEnvelope
}

export class BattleCreateHandler implements EnvelopeHandler {
  readonly name = 'battle_create'

  matches(output: unknown): boolean {
    return isBattleCreateEnvelope(output)
  }

  async handle(
    output: unknown,
    ctx: PostRunContext,
  ): Promise<EnvelopeHandlerResult> {
    if (!ctx.userJwt) {
      throw new Error(
        'battle_create handler requires an authenticated user context (ctx.userJwt). ' +
        'Set fundingSource = workflow_internal on the workflow run to enable this.',
      )
    }

    const envelope = extractData(output)

    const createResponse = await fetch(`${ctx.supabaseUrl}/rest/v1/rpc/fn_battles_create`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ctx.userJwt}`,
        'apikey':        ctx.supabaseAnonKey,
      },
      body: JSON.stringify({
        p_title:             envelope.title,
        p_slug:              envelope.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64),
        p_task_prompt:       envelope.taskPrompt,
        p_rubric_id:         null,
      }),
    })

    if (!createResponse.ok) {
      const body = await createResponse.text().catch(() => createResponse.statusText)
      throw new Error(
        `fn_battles_create returned ${createResponse.status}: ${body}`,
      )
    }

    const battleId = (await createResponse.json().catch(() => null)) as string | null
    if (!battleId) {
      throw new Error('fn_battles_create returned no battle id')
    }

    // Service-role insert into the run log. RLS policy denies authenticated
    // role inserts, so we use the service-role key for this audit trail.
    await fetch(`${ctx.supabaseUrl}/rest/v1/workflow_battle_run_log`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ctx.supabaseServiceRoleKey}`,
        'apikey':        ctx.supabaseServiceRoleKey,
        'Prefer':        'return=minimal',
        'Content-Profile': 'lenses',
      },
      body: JSON.stringify({
        workflow_run_id: ctx.workflowRunId,
        battle_id:       battleId,
        phase:           'created',
        payload:         { source: 'battle_create_handler', envelope },
      }),
    }).catch(() => {
      // Log failure must not block dispatch outcome.
    })

    return {
      handler: this.name,
      handled: true,
      data: { battleId, workflowRunId: ctx.workflowRunId },
    }
  }
}
