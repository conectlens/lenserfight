import { AgentClient } from './agent-client'
import { BattleClient } from './battle-client'
import { createFetchRpcClient, type SupabaseLikeRpcClient } from './client'
import { LensClient } from './lens-client'
import { ProtocolClient } from './protocol-client'
import { TemplateClient } from './template-client'
import { WorkflowClient } from './workflow-client'
import type { CreateClientOptions } from './types'

export class LenserFightClient {
  readonly agents: AgentClient
  readonly battles: BattleClient
  readonly lenses: LensClient
  readonly protocols: ProtocolClient
  readonly templates: TemplateClient
  readonly workflows: WorkflowClient
  private readonly rpc: SupabaseLikeRpcClient

  constructor(rpcClient: SupabaseLikeRpcClient) {
    this.rpc = rpcClient
    this.agents = new AgentClient(rpcClient)
    this.battles = new BattleClient(rpcClient)
    this.lenses = new LensClient(rpcClient)
    this.protocols = new ProtocolClient(rpcClient)
    this.templates = new TemplateClient(rpcClient)
    this.workflows = new WorkflowClient(rpcClient)
  }

  /**
   * Direct RPC escape hatch. Use sparingly — anything that's part of the
   * stable surface should live on a named sub-client.
   */
  async rpcCall<T = unknown>(
    fn: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await this.rpc.rpc(fn, params)
    if (error) {
      throw new Error(`@lenserfight/sdk: ${fn} failed — ${JSON.stringify(error)}`)
    }
    return data as T
  }
}

/**
 * Create a LenserFight client backed by the given project URL + anon key.
 * Pass `apiKey` for authenticated operations (lens execution, workflow runs, etc.).
 *
 * ─── Agents (`client.agents`) ────────────────────────────────────────────────
 * All methods require an authenticated client.
 *
 * - `browse({ ownerId }, limit?)` — list agents owned by `ownerId`
 *     DB: fn_list_agents_by_owner
 * - `getById(agentId)` — full agent profile
 *     DB: fn_get_agent_profile
 * - `getLensBindings(agentId)` — lens bindings for an agent
 *     DB: fn_list_agent_lens_bindings
 * - `getModelBindings(agentId)` — model bindings for an agent
 *     DB: fn_list_agent_model_bindings
 *
 * ─── Lenses (`client.lenses`) ─────────────────────────────────────────────────
 * Requires an authenticated client (fn_mcp_* functions are not anon-accessible).
 *
 * - `browse(filters?, offset?, limit?)` — list public lenses with optional status filter
 *     DB: fn_mcp_lens_list  (when no `search` filter)
 *         fn_mcp_lens_search (when `search` filter is set)
 * - `search(query, filters?, offset?, limit?)` — full-text search across public lenses
 *     DB: fn_mcp_lens_search
 * - `getById(lensId)` — full lens detail including head version
 *     DB: fn_get_lens_detail_bootstrap
 * - `getVersion(versionId)` — version detail (camelCase-mapped) + full parameters with tool info
 *     DB: fn_get_lens_version_detail + fn_get_lens_version_parameters
 * - `getLatestVersion(lensId)` — resolves head_version_id then returns version + parameters
 *     DB: fn_get_lens_detail_bootstrap → fn_get_lens_version_detail + fn_get_lens_version_parameters
 * - `resolveTemplate(lensId, params, { versionId? })` — fill `[[:paramId]]` tokens
 *     DB: fn_mcp_lens_resolve_template
 * - `getParameterContracts(versionId)` — raw parameter contract array from input_contract
 *     DB: fn_get_version_contracts
 * - `extractParams(versionId)` — contracts + label list (convenience wrapper)
 *     DB: fn_get_version_contracts
 * - `validateParams(versionId, values)` — check missing/unknown params
 *     DB: fn_get_version_contracts
 *
 * ─── Protocols (`client.protocols`) ──────────────────────────────────────────
 * Contract and manifest introspection.
 *
 * - `getContractByVersion(versionId)` — input contract for a lens version
 *     DB: fn_get_version_contracts
 * - `getContractByHash(contentHash)` — NOT IMPLEMENTED (no DB function); always returns null
 * - `getManifest(versionId)` — manifest built from input contract (no channel/signatures)
 *     DB: fn_get_version_contracts
 * - `getDependencies(contentHash)` — NOT IMPLEMENTED (no DB function); always returns []
 * - `checkCompatibility(versionId, requiredScopes)` — client-side scope check
 *     DB: fn_get_version_contracts
 *
 * ─── Workflows (`client.workflows`) ──────────────────────────────────────────
 * All methods require an authenticated client.
 *
 * - `browse({ limit?, offset?, visibility? })` — list workflows visible to the user
 *     DB: fn_mcp_workflow_list
 * - `getById(workflowId)` — single workflow detail
 *     DB: fn_mcp_workflow_get
 * - `startRun(workflowId, inputs?, { idempotencyKey?, modelId? })` — start async run
 *     DB: fn_mcp_workflow_run_start
 * - `getRunStatus(runId)` — poll run state
 *     DB: fn_mcp_workflow_run_status
 * - `getRunLogs(runId)` — per-node execution logs for a completed run
 *     DB: fn_mcp_workflow_run_logs
 * - `awaitRun(workflowId, inputs?, { timeoutMs? })` — start + poll until terminal state
 *     DB: fn_mcp_workflow_run_start → fn_mcp_workflow_run_status → fn_mcp_workflow_run_logs
 *
 * ─── Battles (`client.battles`) ───────────────────────────────────────────────
 * Publicly accessible (anon-compatible).
 *
 * - `browse(filters?, cursor?, limit?)` — list public battles (keyset paginated)
 *     DB: fn_browse_battles
 *
 * ─── Templates (`client.templates`) ──────────────────────────────────────────
 * - `renderPrompt(templateId, variables)` — render a template with variable substitution
 *
 * ─── Escape hatch ─────────────────────────────────────────────────────────────
 * - `rpcCall(fn, params?)` — call any public RPC directly
 *
 * @example
 *   import { createClient } from '@lenserfight/sdk';
 *
 *   const lf = createClient({
 *     url: 'https://your-project.supabase.co',
 *     anonKey: 'sb_publishable_...',
 *     apiKey: 'your-api-key', // required for authenticated operations
 *   });
 *
 *   // Browse public lenses
 *   const lenses = await lf.lenses.browse({}, 0, 20);
 *
 *   // Resolve a lens template with parameter values
 *   const result = await lf.lenses.resolveTemplate(lensId, { Topic: 'TypeScript' });
 *   // result.resolvedPrompt is ready to pass to your AI model
 *
 *   // Run a workflow and wait for completion
 *   const logs = await lf.workflows.awaitRun(workflowId, { topic: 'AI' });
 */
export function createClient(options: CreateClientOptions): LenserFightClient {
  const rpcClient = createFetchRpcClient(options)
  return new LenserFightClient(rpcClient)
}

/**
 * Construct a client from a pre-existing Supabase-shaped RPC client. Useful
 * when the host application already manages the Supabase JS instance and you
 * want to share it with the SDK.
 */
export function createClientFromRpc(rpcClient: SupabaseLikeRpcClient): LenserFightClient {
  return new LenserFightClient(rpcClient)
}
