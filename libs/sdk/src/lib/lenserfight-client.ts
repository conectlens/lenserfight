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
   * stable surface should live on `battles` / `templates` (or get added there
   * in a follow-up PR).
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
 * Create a LenserFight client. The returned client exposes:
 *
 * - `client.agents.browse(filters?, cursor?, limit?)` — list public agents
 * - `client.agents.getById(agentId)` — get agent profile detail
 * - `client.lenses.browse(filters?, cursor?, limit?)` — list public lenses
 * - `client.lenses.resolveTemplate(lensId, params)` — fill a lens template (requires `apiKey`)
 * - `client.workflows.browse()` — list workflows
 * - `client.workflows.startRun(workflowId, inputs?)` — start a workflow run (requires `apiKey`)
 * - `client.workflows.awaitRun(workflowId, inputs?)` — start and poll until complete (requires `apiKey`)
 * - `client.battles.browse(filters?, cursor?, limit?)` — list public battles
 * - `client.templates.renderPrompt(templateId, variables)` — render a template
 * - `client.rpcCall(fn, params)` — escape hatch for any other RPC
 *
 * For server-to-server use (e.g. Chainabit backend), pass `apiKey` alongside
 * `anonKey` to authenticate requests with a developer token.
 *
 * @example
 *   import { createClient } from '@lenserfight/sdk';
 *   const lf = createClient({
 *     url: 'https://your-supabase-project.supabase.co',
 *     anonKey: 'sb_publishable_...',
 *     apiKey: 'your-developer-token', // optional, for authenticated operations
 *   });
 *   const result = await lf.lenses.resolveTemplate(lensId, { Topic: 'TypeScript' });
 *   // result.resolvedPrompt is ready to pass to your AI model
 */
export function createClient(options: CreateClientOptions): LenserFightClient {
  const rpcClient = createFetchRpcClient(options)
  return new LenserFightClient(rpcClient)
}

/**
 * Construct a client from a pre-existing Supabase-shaped RPC client. Useful
 * when the host application is already managing the Supabase JS instance and
 * we just want to share it with the SDK.
 */
export function createClientFromRpc(rpcClient: SupabaseLikeRpcClient): LenserFightClient {
  return new LenserFightClient(rpcClient)
}
