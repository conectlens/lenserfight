import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';
import { p } from '../tool-params.js';
import { workflowService, type WorkflowGraph } from '../../services/workflow.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('describe_workflow');
const TOOL = meta.name;

const TRIGGER_TYPES = new Set([
  'manual_trigger',
  'event_trigger',
  'form_input_trigger',
  'webhook_trigger',
  'schedule_trigger',
]);

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/** Transform a raw {workflow, nodes, edges} graph into a compact, LLM-readable explanation. */
function describeGraph(graph: WorkflowGraph) {
  const wf = asRecord(graph.workflow);
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  const nodeSummaries = nodes.map((n) => {
    const node = asRecord(n);
    const config = asRecord(node.config);
    const type =
      typeof config.node_type === 'string' ? config.node_type : node.lens_id ? 'lens' : 'unknown';
    const params =
      config.param_overrides && typeof config.param_overrides === 'object'
        ? (config.param_overrides as Record<string, unknown>)
        : undefined;
    return {
      id: node.id,
      type,
      lens_id: node.lens_id ?? undefined,
      model_id: config.model_id ?? undefined,
      params,
    };
  });

  const triggers = nodeSummaries
    .filter((n) => typeof n.type === 'string' && TRIGGER_TYPES.has(n.type))
    .map((n) => ({ id: n.id, type: n.type }));

  const connections = edges.map((e) => {
    const edge = asRecord(e);
    return {
      from: edge.source_node_id,
      output_key: edge.source_output_key ?? 'output',
      to: edge.target_node_id,
      param: edge.target_param_label,
      merge_strategy: edge.merge_strategy ?? undefined,
      conditional: edge.condition != null,
    };
  });

  const title = typeof wf.title === 'string' ? wf.title : 'Untitled workflow';
  const triggerDesc = triggers.length
    ? triggers.map((t) => t.type).join(', ')
    : 'no explicit trigger node';

  const summary =
    `Workflow "${title}" has ${nodeSummaries.length} node(s) and ${connections.length} connection(s). ` +
    `It starts from ${triggerDesc}. ` +
    `Data flows via edges that map a source node's output key to a target node's parameter label; ` +
    `parametric prompts (lenses) are bound on nodes with a lens_id and receive values through param_overrides and incoming edges.`;

  return {
    workflow: {
      id: wf.id,
      title: wf.title,
      description: wf.description,
      visibility: wf.visibility,
    },
    summary,
    node_count: nodeSummaries.length,
    edge_count: connections.length,
    triggers,
    nodes: nodeSummaries,
    connections,
  };
}

export function registerWorkflowDescribe(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    { workflow_id: p.workflow_id },
    async ({ workflow_id }) => {
      const t0 = Date.now();
      try {
        const graph = await workflowService.getGraph(sb, workflow_id);
        if (!graph) return fail('NOT_FOUND', `Workflow ${workflow_id} not found or not visible`, {}, TOOL, t0);
        return ok(describeGraph(graph), TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
