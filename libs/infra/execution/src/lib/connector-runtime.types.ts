import type { ConnectorCapability, ConnectorProvider } from '@lenserfight/domain/oauth-connections'
import type { ExecutionResult } from './execution.types'

export interface ConnectorOperationRequest {
  readonly connectorRef: string
  readonly provider: ConnectorProvider
  readonly capability: ConnectorCapability
  readonly operation: string
  readonly requiredScopes: readonly string[]
  readonly params: Record<string, unknown>
}

export interface ConnectorResolvedCredential {
  readonly accessToken: string
  readonly providerConfig?: Record<string, unknown>
}

export interface ConnectorOperationAdapter {
  readonly provider: ConnectorProvider
  execute(
    request: ConnectorOperationRequest,
    credential: ConnectorResolvedCredential | null,
  ): Promise<ExecutionResult>
}

export type ConnectorOperationExecutor = (request: ConnectorOperationRequest) => Promise<ExecutionResult>
