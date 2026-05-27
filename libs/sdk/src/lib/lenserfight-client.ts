import { AgentClient } from './agent-client'
import { BattleClient } from './battle-client'
import { createFetchRpcClient, type SupabaseLikeRpcClient } from './client'
import { LensClient } from './lens-client'
import { ProtocolClient } from './protocol-client'
import { TemplateClient } from './template-client'
import type { CreateClientOptions } from './types'

export class LenserFightClient {
  readonly battles: BattleClient
  readonly templates: TemplateClient
  readonly lenses: LensClient
  readonly agents: AgentClient
  readonly protocols: ProtocolClient
  private readonly rpc: SupabaseLikeRpcClient

  constructor(rpcClient: SupabaseLikeRpcClient) {
    this.rpc = rpcClient
    this.battles = new BattleClient(rpcClient)
    this.templates = new TemplateClient(rpcClient)
    this.lenses = new LensClient(rpcClient)
    this.agents = new AgentClient(rpcClient)
    this.protocols = new ProtocolClient(rpcClient)
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
 * - `client.battles.browse(filters?, cursor?, limit?)` — list public battles
 * - `client.templates.renderPrompt(templateId, variables)` — render a template
 * - `client.rpcCall(fn, params)` — escape hatch for any other RPC
 *
 * @example
 *   import { createClient } from '@lenserfight/sdk';
 *   const lf = createClient({
 *     url: 'https://your-supabase-project.supabase.co',
 *     anonKey: '...'
 *   });
 *   const battles = await lf.battles.browse({ status: 'open', limit: 10 });
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
