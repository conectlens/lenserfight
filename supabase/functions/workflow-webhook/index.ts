// Supabase Edge Function: workflow-webhook
//
// Purpose: Accept external HTTP POST triggers for a workflow and enqueue a run.
// URL pattern: /functions/v1/workflow-webhook/<workflow_id>?secret=<webhook_secret>
// Validates the optional webhook secret stored on the workflow, then calls
// fn_mcp_workflow_run_start with the request body as context inputs.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const rpcHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

const rpc = (name: string, body: Record<string, unknown>) =>
  fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: rpcHeaders,
    body: JSON.stringify(body),
  })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Supabase credentials not configured', { status: 500 })
  }

  // Extract workflow_id from the last path segment.
  // E.g. /functions/v1/workflow-webhook/00000000-0000-0000-0000-000000000001
  const url = new URL(req.url)
  const pathSegments = url.pathname.replace(/\/$/, '').split('/')
  const workflowId = pathSegments[pathSegments.length - 1]

  if (!workflowId || workflowId === 'workflow-webhook') {
    return new Response(JSON.stringify({ error: 'missing_workflow_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const secret = url.searchParams.get('secret')

  // Fetch webhook config via service-role-only RPC
  const configRes = await rpc('fn_get_workflow_webhook_config', { p_workflow_id: workflowId })
  const config = await configRes.json()

  // RPC returns NULL → PostgREST returns null or empty array
  if (!config || (Array.isArray(config) && config.length === 0)) {
    return new Response(JSON.stringify({ error: 'workflow_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cfg = Array.isArray(config) ? config[0] : config

  if (!cfg) {
    return new Response(JSON.stringify({ error: 'workflow_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate secret if one is configured
  if (cfg.webhook_secret && cfg.webhook_secret !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse request body as context inputs (gracefully handle non-JSON)
  let inputs: Record<string, unknown> = {}
  try {
    inputs = await req.json()
  } catch {
    // Non-JSON body → treat as empty inputs
  }

  // Enqueue a workflow run using the existing service-role-accessible RPC
  const runRes = await rpc('fn_mcp_workflow_run_start', {
    p_workflow_id: workflowId,
    p_inputs: inputs,
    p_metadata: { trigger_source: 'webhook' },
  })

  if (!runRes.ok) {
    const errText = await runRes.text()
    console.error('fn_mcp_workflow_run_start error:', errText)
    return new Response(JSON.stringify({ error: 'enqueue_failed', detail: errText }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const runData = await runRes.json()
  // fn_mcp_workflow_run_start returns jsonb: { id, status, created_at }
  const run = Array.isArray(runData) ? runData[0] : runData

  return new Response(
    JSON.stringify({ run_id: run?.id ?? null, status: 'queued' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
