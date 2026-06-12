import type { SupabaseLikeRpcClient } from './client'
import type {
  SdkCompatibilityResult,
  SdkDependencyEdge,
  SdkLensContract,
  SdkLensContractBody,
  SdkLensManifest,
} from './types/protocols'

export class ProtocolClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * Get the input contract for a lens version. Uses `fn_get_version_contracts`.
   * Note: contentHash, publishedBy, publishedAt are not available from this function.
   */
  async getContractByVersion(versionId: string): Promise<SdkLensContract | null> {
    const { data, error } = await this.rpcClient.rpc('fn_get_version_contracts', {
      p_version_id: versionId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_get_version_contracts failed — ${JSON.stringify(error)}`)
    }
    if (!data) return null
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null
    const body = (row as Record<string, unknown>)['input_contract'] as SdkLensContractBody | null
    if (!body) return null
    return { contentHash: '', body, publishedBy: '', publishedAt: '', supersedesHash: null }
  }

  /**
   * Hash-based contract lookup is not supported by the current DB schema.
   * Always returns null.
   */
  async getContractByHash(_contentHash: string): Promise<SdkLensContract | null> {
    return null
  }

  /**
   * Get the manifest for a lens version. Built from `fn_get_version_contracts`.
   * Channel and signatures are not available.
   */
  async getManifest(versionId: string): Promise<SdkLensManifest | null> {
    const contract = await this.getContractByVersion(versionId)
    if (!contract) return null
    return {
      specVersion: contract.body?.specVersion ?? '1.0.0',
      contentHash: contract.contentHash,
      body: contract.body,
      channel: null,
      signatures: [],
    }
  }

  /**
   * Dependency graph lookup is not supported by the current DB schema.
   * Always returns an empty array.
   */
  async getDependencies(_contentHash: string): Promise<SdkDependencyEdge[]> {
    return []
  }

  /**
   * Check if a lens version satisfies required scopes. Fetches the contract
   * via `getContractByVersion` and compares scopes locally.
   */
  async checkCompatibility(
    versionId: string,
    requiredScopes: string[],
  ): Promise<SdkCompatibilityResult> {
    const contract = await this.getContractByVersion(versionId)
    if (!contract) {
      return { compatible: false, missingScopes: [], warnings: ['Contract not found'] }
    }
    const contractScopes = contract.body?.requiredScopes ?? []
    const missing = requiredScopes.filter((s) => !contractScopes.includes(s))
    return { compatible: missing.length === 0, missingScopes: missing, warnings: [] }
  }
}
