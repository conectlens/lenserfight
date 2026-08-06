import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  getWorkflowNodeCatalogEntry,
  type WorkflowNodeCatalogEntry,
  type WorkflowNodeConfigField,
} from '@lenserfight/infra/execution/catalog';

import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { ok, fail } from '../../types.js';

const meta = getToolMeta('describe_workflow_node_type');
const TOOL = meta.name;

function describeConfigField(field: WorkflowNodeConfigField) {
  return {
    key: field.key,
    label: field.label,
    kind: field.kind,
    required: field.required ?? false,
    default_value: field.defaultValue,
    options: field.options,
    description: field.description,
  };
}

// Response omits iconKey/iconName/color (frontend palette presentation only,
// not relevant to an AI client) and n8nMapping/n8nEquivalent (n8n interop
// metadata, out of scope for using the node on this platform). Nothing here
// is a secret — the catalog is a design-time constant with no credentials or
// internal-only execution details.
function describeNodeType(entry: WorkflowNodeCatalogEntry) {
  return {
    type: entry.type,
    display_name: entry.displayName,
    description: entry.description,
    category: entry.category,
    aliases: entry.aliases,
    capabilities: entry.capabilities,
    inputs: entry.inputs,
    outputs: entry.outputs,
    required_config: entry.requiredConfig.map(describeConfigField),
    optional_config: entry.optionalConfig.map(describeConfigField),
    default_config: entry.defaultConfig,
    example_config: {
      scenario: entry.exampleConfig.scenario,
      config: entry.exampleConfig.config,
      expected_input: entry.exampleConfig.expectedInput,
      expected_output: entry.exampleConfig.expectedOutput,
      downstream_connection: {
        node_type: entry.exampleConfig.downstreamConnection.nodeType,
        mapping: entry.exampleConfig.downstreamConnection.mapping,
      },
    },
    accepts_input_types: entry.acceptsInputTypes,
    produces_output_type: entry.producesOutputType,
    supported_funding_modes: entry.supportedFundingModes,
    supported_execution_environments: entry.supportedExecutionEnvironments,
    retry_behavior: {
      max_attempts: entry.retryBehavior.maxAttempts,
      backoff_ms: entry.retryBehavior.backoffMs,
      retry_on: entry.retryBehavior.retryOn,
    },
    error_behavior: {
      default_policy: entry.errorBehavior.defaultPolicy,
      supports_fallback: entry.errorBehavior.supportsFallback,
    },
    side_effect_policy: entry.sideEffectPolicy,
    example_use_case: entry.exampleUseCase,
    docs_link: entry.docsLink,
  };
}

export function registerWorkflowDescribeNodeType(server: McpServer, _sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      type: z.string().min(1).describe('Node type identifier from the canonical catalog (e.g. lens_execute, schedule_trigger).'),
    },
    async ({ type }) => {
      const t0 = Date.now();
      const entry = getWorkflowNodeCatalogEntry(type);
      if (!entry) {
        return fail('NOT_FOUND', `Workflow node type "${type}" is not registered in the catalog`, {}, TOOL, t0);
      }
      return ok(describeNodeType(entry), TOOL, t0);
    }
  );
}
