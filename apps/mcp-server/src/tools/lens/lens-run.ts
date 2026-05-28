import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServiceClient } from '../../client.js';
import { ok, fail } from '../../types.js';

interface VersionParam {
  id: string;
  label: string;
  optional: boolean;
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

export function registerLensRun(server: McpServer): void {
  server.tool(
    'lens_run',
    'Resolve a lens template by substituting [[Parameter]] tokens with provided values. Returns the resolved prompt ready for AI execution. Does NOT call an LLM — the calling AI model executes the resolved prompt. Optionally creates a workflow_run record for tracking.',
    {
      lens_id: z.string().uuid(),
      version_id: z.string().uuid().optional(),
      param_values: z.record(z.string()).default({}).optional(),
      workflow_id: z.string().uuid().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const values = args.param_values ?? {};
      try {
        const sb = getServiceClient();
        const schema = (sb as never as { schema: (s: string) => typeof sb }).schema('lenses');

        let resolvedVersionId = args.version_id;
        if (!resolvedVersionId) {
          const { data: lens, error: lensErr } = await schema
            .from('lenses')
            .select('head_version_id')
            .eq('id', args.lens_id)
            .is('deleted_at', null)
            .single() as unknown as { data: { head_version_id: string } | null; error: unknown };
          if (lensErr || !lens) return fail('NOT_FOUND', `Lens ${args.lens_id} not found`, {}, 'lens_run', t0);
          resolvedVersionId = lens.head_version_id;
        }

        const { data: version, error: verErr } = await schema
          .from('versions')
          .select('template_body')
          .eq('id', resolvedVersionId)
          .single() as unknown as { data: { template_body: string } | null; error: unknown };
        if (verErr || !version) return fail('NOT_FOUND', `Version ${resolvedVersionId} not found`, {}, 'lens_run', t0);

        const { data: params } = await schema
          .from('version_parameters')
          .select('id, label, optional')
          .eq('version_id', resolvedVersionId) as unknown as { data: VersionParam[] | null };

        const { resolved, missing, used } = resolveTemplate(version.template_body, params ?? [], values);

        if (missing.length > 0) {
          return fail('MISSING_PARAMS', 'Required parameters not provided.', { missing }, 'lens_run', t0);
        }

        let runId: string | null = null;
        let persisted = false;

        if (args.workflow_id) {
          const { data: run, error: runErr } = await schema
            .from('workflow_runs')
            .insert({
              workflow_id: args.workflow_id,
              status: 'pending',
              trigger_mode: 'manual',
              context_inputs: values,
              metadata: {
                mcp_tool: 'lens_run',
                lens_id: args.lens_id,
                version_id: resolvedVersionId,
              },
            })
            .select('id')
            .single() as unknown as { data: { id: string } | null; error: unknown };
          if (!runErr && run) {
            runId = run.id;
            persisted = true;
          }
        }

        return ok({
          resolved_prompt: resolved,
          run_id: runId,
          lens_id: args.lens_id,
          version_id: resolvedVersionId,
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
