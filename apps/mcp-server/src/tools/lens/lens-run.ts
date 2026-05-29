import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { p } from '../tool-params.js';
import { lensService } from '../../services/lens.service.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('run_lens');
const TOOL = meta.name;

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

export function registerLensRun(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      lens_id: p.lens_id,
      version_id: p.lens_version_id.optional(),
      param_values: z.record(z.string(), z.string()).default({}).optional(),
      workflow_id: p.workflow_id.optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const values: Record<string, string> = (args.param_values ?? {}) as Record<string, string>;
      try {
        const resolveData = await lensService.resolveTemplate(sb, {
          lens_id: args.lens_id,
          version_id: args.version_id,
        });
        if (!resolveData) return fail('NOT_FOUND', `Lens ${args.lens_id} not found`, {}, TOOL, t0);

        const { resolved, missing, used } = resolveTemplate(
          resolveData.template_body,
          resolveData.parameters ?? [],
          values
        );

        if (missing.length > 0) {
          return fail(
            'MISSING_PARAMS',
            `Lens "${resolveData.title ?? args.lens_id}" needs ${missing.length} more parameter(s) before it can run. Ask the user for: ${missing.join(', ')}. Then call run_lens again with param_values including these labels.`,
            {
              missing,
              all_parameters: resolveData.parameters ?? [],
              lens_title: resolveData.title ?? null,
              lens_description: resolveData.description ?? null,
            },
            TOOL,
            t0
          );
        }

        let runId: string | null = null;
        let persisted = false;

        if (args.workflow_id) {
          try {
            const run = await workflowService.startRun(sb, {
              workflow_id: args.workflow_id,
              inputs: values,
              global_model_id: null,
              idempotency_key: null,
              metadata: {
                mcp_tool: TOOL,
                lens_id: args.lens_id,
                version_id: resolveData.version_id,
              },
            });
            if (run) {
              runId = run.id;
              persisted = true;
            }
          } catch {
            // Persistence is best-effort; lens resolution still succeeds.
          }
        }

        return ok(
          {
            resolved_prompt: resolved,
            lens_title: resolveData.title ?? null,
            lens_description: resolveData.description ?? null,
            lens_id: args.lens_id,
            version_id: resolveData.version_id,
            run_id: runId,
            params_used: used,
            estimated_input_tokens: Math.ceil(resolved.length / 4),
            persisted,
            next_step:
              'Execute the resolved_prompt and return the result to the user. This MCP tool does not call any LLM itself.',
          },
          TOOL,
          t0
        );
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
