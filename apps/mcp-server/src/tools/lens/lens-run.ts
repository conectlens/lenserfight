import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

interface VersionParam {
  id: string;
  label: string;
  optional: boolean;
}

interface ResolveTemplateResult {
  lens_id: string;
  version_id: string;
  template_body: string;
  parameters: VersionParam[];
}

export function resolveTemplate(
  body: string,
  params: VersionParam[],
  values: Record<string, string>
): { resolved: string; missing: string[]; used: string[] } {
  let resolved = body;
  const missing: string[] = [];
  const used: string[] = [];

  for (const param of params) {
    const token = `[[:${param.id}]]`;
    const value =
      values[param.label] ??
      values[param.label.toLowerCase()] ??
      Object.entries(values).find(([k]) => k.toLowerCase() === param.label.toLowerCase())?.[1];

    if (value !== undefined) {
      resolved = resolved.split(token).join(value);
      used.push(param.label);
    } else if (!param.optional) {
      missing.push(param.label);
    } else {
      resolved = resolved.split(token).join('');
    }
  }

  return { resolved, missing, used };
}

export function registerLensRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_run',
    'Resolve a lens template by substituting [[Parameter]] tokens with provided values. Returns the resolved prompt ready for AI execution. Does NOT call an LLM — the calling AI model executes the resolved prompt. Optionally creates a workflow_run record for tracking.',
    {
      lens_id: z.string().uuid(),
      version_id: z.string().uuid().optional(),
      param_values: z.record(z.string(), z.string()).default({}).optional(),
      workflow_id: z.string().uuid().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const values: Record<string, string> = (args.param_values ?? {}) as Record<string, string>;
      try {
        const { data: resolveData, error: resolveErr } = (await sb.rpc(
          'fn_mcp_lens_resolve_template' as never,
          { p_lens_id: args.lens_id, p_version_id: args.version_id ?? null }
        )) as unknown as {
          data: ResolveTemplateResult | null;
          error: { message: string } | null;
        };
        if (resolveErr) throw new Error(resolveErr.message);
        if (!resolveData) return fail('NOT_FOUND', `Lens ${args.lens_id} not found`, {}, 'lens_run', t0);

        const { resolved, missing, used } = resolveTemplate(
          resolveData.template_body,
          resolveData.parameters ?? [],
          values
        );

        if (missing.length > 0) {
          return fail('MISSING_PARAMS', 'Required parameters not provided.', { missing }, 'lens_run', t0);
        }

        let runId: string | null = null;
        let persisted = false;

        if (args.workflow_id) {
          const { data: run, error: runErr } = (await sb.rpc(
            'fn_mcp_workflow_run_start' as never,
            {
              p_workflow_id: args.workflow_id,
              p_inputs: values,
              p_global_model_id: null,
              p_idempotency_key: null,
              p_metadata: {
                mcp_tool: 'lens_run',
                lens_id: args.lens_id,
                version_id: resolveData.version_id,
              },
            }
          )) as unknown as {
            data: { id: string } | null;
            error: { message: string } | null;
          };
          if (!runErr && run) {
            runId = run.id;
            persisted = true;
          }
        }

        return ok({
          resolved_prompt: resolved,
          run_id: runId,
          lens_id: args.lens_id,
          version_id: resolveData.version_id,
          params_used: used,
          estimated_input_tokens: Math.ceil(resolved.length / 4),
          persisted,
        }, 'lens_run', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_run', t0);
      }
    }
  );
}
