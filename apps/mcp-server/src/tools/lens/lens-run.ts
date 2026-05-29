import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, zUuid } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { workflowService } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const TOOL = 'run_lens';

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
  server.tool(
    TOOL,
    `Resolve a lens template into a ready-to-execute prompt by substituting its [[Parameter]] tokens with values you supply.

WORKFLOW:
1. Discover lenses with list_lenses or search_lenses.
2. Call get_lens(lens_id) to see the parameter list (label + optional flag) and template body.
3. Call run_lens(lens_id, param_values={"Topic":"...", "Language":"..."}) with values keyed by parameter label.
4. The returned 'resolved_prompt' is what YOU (the AI model) should execute next — this tool does NOT call an LLM. Read 'resolved_prompt' and respond to the user with the result.

PARAM VALUES:
- Match parameter labels case-insensitively (e.g. "topic" works for label "Topic").
- Missing required params → returns MISSING_PARAMS error with the labels to ask the user for.
- Unknown keys are ignored.
- Optional params not provided → token replaced with empty string.

If workflow_id is given, the run is persisted as a workflow run record for telemetry; otherwise it is ephemeral.`,
    {
      lens_id: zUuid,
      version_id: zUuid.optional(),
      param_values: z.record(z.string(), z.string()).default({}).optional(),
      workflow_id: zUuid.optional(),
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
