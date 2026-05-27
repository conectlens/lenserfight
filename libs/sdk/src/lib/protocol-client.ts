import type { SupabaseLikeRpcClient } from './client'
import type {
  SdkCompatibilityResult,
  SdkDependencyEdge,
  SdkLensContract,
  SdkLensManifest,
} from './types/protocols'

export class ProtocolClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * Get the contract for a lens version (by version_id).
   * Uses `fn_sdk_get_contract(p_version_id)`.
   */
  async getContractByVersion(versionId: string): Promise<SdkLensContract | null> {
    const { data, error } = await this.rpcClient.rpc('fn_sdk_get_contract', {
      p_version_id: versionId,
      p_content_hash: null,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_sdk_get_contract failed — ${JSON.stringify(error)}`)
    }
    return (data as SdkLensContract) ?? null
  }

  /**
   * Get a contract by its content hash (hex-encoded SHA-256).
   * Uses `fn_sdk_get_contract(p_content_hash)`.
   */
  async getContractByHash(contentHash: string): Promise<SdkLensContract | null> {
    const { data, error } = await this.rpcClient.rpc('fn_sdk_get_contract', {
      p_version_id: null,
      p_content_hash: contentHash,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_sdk_get_contract failed — ${JSON.stringify(error)}`)
    }
    return (data as SdkLensContract) ?? null
  }

  /**
   * Get the full manifest (contract + channel + signatures) for a version.
   */
  async getManifest(versionId: string): Promise<SdkLensManifest | null> {
    const { data, error } = await this.rpcClient.rpc('fn_sdk_get_manifest', {
      p_version_id: versionId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_sdk_get_manifest failed — ${JSON.stringify(error)}`)
    }
    return (data as SdkLensManifest) ?? null
  }

  /**
   * Get dependency edges for a contract (its children in the DAG).
   */
  async getDependencies(contentHash: string): Promise<SdkDependencyEdge[]> {
    const { data, error } = await this.rpcClient.rpc('fn_sdk_get_dependencies', {
      p_content_hash: contentHash,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_sdk_get_dependencies failed — ${JSON.stringify(error)}`)
    }
    return Array.isArray(data) ? (data as SdkDependencyEdge[]) : []
  }

  /**
   * Check if a contract satisfies required scopes. Pure client-side logic —
   * fetches the contract and compares scopes locally.
   */
  async checkCompatibility(
    contentHash: string,
    requiredScopes: string[],
  ): Promise<SdkCompatibilityResult> {
    const contract = await this.getContractByHash(contentHash)
    if (!contract) {
      return { compatible: false, missingScopes: [], warnings: ['Contract not found'] }
    }
    const contractScopes = contract.body.requiredScopes ?? []
    const missing = requiredScopes.filter((s) => !contractScopes.includes(s))
    return { compatible: missing.length === 0, missingScopes: missing, warnings: [] }
  }
}
