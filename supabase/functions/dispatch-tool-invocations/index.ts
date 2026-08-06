// Supabase Edge Function: dispatch-tool-invocations
//
// Purpose: Generic dispatcher for agents.tool_invocations. Claims rows that
// fn_invoke_tool / fn_approve_tool_invocation moved to status='running' and
// actually performs the outbound HTTP call described by the owning tool's
// agents.tools_registry row (endpoint_url, http_method, request_template,
// auth_method/auth_placement/auth_param_name — see RFC-0006). No tool is
// special-cased here: Postiz (issue #464) is configured data, not code.
//
// Invocation: Called by pg_cron every 15 seconds.
//   SELECT cron.schedule('dispatch-tool-invocations', '*/15 * * * * *',
//     $$SELECT net.http_post(url := 'SUPABASE_URL/functions/v1/dispatch-tool-invocations',
//       headers := '{"Authorization":"Bearer SERVICE_ROLE_KEY"}')$$);
//
// It calls fn_claim_tool_invocations() to atomically claim a batch, resolves
// each tool's credential via fn_resolve_tool_credential() when auth_method
// isn't 'none', performs the HTTP call, and reports the outcome back through
// fn_complete_tool_invocation() (status 'completed' or 'failed').

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ClaimedInvocation {
  invocation_id: string;
  tool_id: string;
  input: Record<string, unknown>;
  endpoint_url: string | null;
  http_method: string;
  request_template: { headers?: Record<string, string>; body?: Record<string, unknown> };
  auth_method: 'none' | 'api_key' | 'oauth' | 'service_account';
  auth_placement: 'header' | 'query';
  auth_param_name: string;
}

// ─── Build and perform the outbound call for one claimed invocation ─────────

async function dispatchOne(
  inv: ClaimedInvocation,
  credential: string | null
): Promise<{ status: 'completed' | 'failed'; output?: unknown; error?: string }> {
  if (!inv.endpoint_url) {
    return { status: 'failed', error: 'tool has no endpoint_url configured' };
  }

  let url = inv.endpoint_url;
  const headers: Record<string, string> = { ...(inv.request_template.headers ?? {}) };
  const bodyObj = { ...(inv.request_template.body ?? {}), ...inv.input };

  if (inv.auth_method !== 'none' && credential) {
    if (inv.auth_placement === 'query') {
      const u = new URL(url);
      u.searchParams.set(inv.auth_param_name, credential);
      url = u.toString();
    } else {
      headers[inv.auth_param_name] = credential;
    }
  }

  const hasBody = !['GET', 'DELETE'].includes(inv.http_method);
  if (hasBody) headers['Content-Type'] ??= 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: inv.http_method,
      headers,
      body: hasBody ? JSON.stringify(bodyObj) : undefined,
    });
  } catch (err) {
    return { status: 'failed', error: `network error: ${err instanceof Error ? err.message : String(err)}` };
  }

  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* leave as raw text */ }

  if (!res.ok) {
    return { status: 'failed', error: `HTTP ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}` };
  }

  return { status: 'completed', output: parsed };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: claimed, error: claimError } = await supabase
    .rpc('fn_claim_tool_invocations', { p_stale_after_seconds: 30, p_limit: 20 });

  if (claimError) {
    console.error('fn_claim_tool_invocations error:', claimError);
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
  }

  const invocations = (claimed ?? []) as ClaimedInvocation[];
  const results: Record<string, string> = {};

  for (const inv of invocations) {
    try {
      let credential: string | null = null;
      if (inv.auth_method !== 'none') {
        const { data, error } = await supabase
          .rpc('fn_resolve_tool_credential', { p_tool_id: inv.tool_id });
        if (error) throw new Error(`credential resolution failed: ${error.message}`);
        credential = data as string | null;
      }

      const outcome = await dispatchOne(inv, credential);

      await supabase.rpc('fn_complete_tool_invocation', {
        p_invocation_id: inv.invocation_id,
        p_status: outcome.status,
        p_output: outcome.status === 'completed' ? outcome.output : null,
        p_error: outcome.status === 'failed' ? outcome.error : null,
        p_cost: null,
      });

      results[inv.invocation_id] = outcome.status;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Dispatch error for invocation ${inv.invocation_id}:`, message);
      await supabase.rpc('fn_complete_tool_invocation', {
        p_invocation_id: inv.invocation_id,
        p_status: 'failed',
        p_output: null,
        p_error: message,
        p_cost: null,
      });
      results[inv.invocation_id] = `error: ${message}`;
    }
  }

  return new Response(
    JSON.stringify({ dispatched: invocations.length, results }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
