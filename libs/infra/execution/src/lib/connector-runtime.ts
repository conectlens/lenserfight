import { getOAuthCapabilityDefinition } from '@lenserfight/domain/oauth-connections'
import type { ConnectorProvider } from '@lenserfight/domain/oauth-connections'
import type { ConnectorCredentialResolver } from './connector-credential-resolver'
import type {
  ConnectorOperationAdapter,
  ConnectorOperationExecutor,
  ConnectorOperationRequest,
  ConnectorResolvedCredential,
} from './connector-runtime.types'
import type { ExecutionResult } from './execution.types'
import {
  maskSensitiveFields,
  sanitizeCustomHttpHeaders,
  validateCustomHttpUrl,
} from './custom-http-safety'

const PRIORITY_PROVIDERS = new Set<ConnectorProvider>([
  'notion',
  'google',
  'asana',
  'monday',
  'zapier',
  'slack',
  'github',
  'jira',
  'linear',
  'custom_http',
])

export interface ConnectorRuntimeOptions {
  readonly credentialResolver?: ConnectorCredentialResolver
  readonly providerConfigResolver?: (connectorRef: string) => Promise<Record<string, unknown> | null>
  readonly adapters?: readonly ConnectorOperationAdapter[]
}

export class ConnectorRuntime {
  private readonly adapters = new Map<ConnectorProvider, ConnectorOperationAdapter>()

  constructor(private readonly options: ConnectorRuntimeOptions = {}) {
    for (const adapter of createDefaultConnectorAdapters()) {
      this.adapters.set(adapter.provider, adapter)
    }
    for (const adapter of options.adapters ?? []) {
      this.adapters.set(adapter.provider, adapter)
    }
  }

  execute: ConnectorOperationExecutor = async (request) => {
    const capability = getOAuthCapabilityDefinition(request.provider, request.capability)
    if (!capability) {
      return connectorError('connector_capability_unknown', {
        provider: request.provider,
        capability: request.capability,
      })
    }

    const operation = capability.operations?.find((candidate) => candidate.operation === request.operation)
    if (!operation || operation.availability === 'metadata_only' || operation.availability === 'planned') {
      return connectorError('connector_operation_unavailable', {
        provider: request.provider,
        capability: request.capability,
        operation: request.operation,
      })
    }

    const adapter = this.adapters.get(request.provider)
    if (!adapter || !PRIORITY_PROVIDERS.has(request.provider)) {
      return connectorError('connector_operation_unavailable', {
        provider: request.provider,
        operation: request.operation,
      })
    }

    const requiredScopes = request.requiredScopes.length > 0 ? request.requiredScopes : capability.requiredScopes
    const accessToken = await this.options.credentialResolver?.resolve(request.connectorRef, [...requiredScopes])
    if (!accessToken) {
      return connectorError('connector_not_resolved', {
        provider: request.provider,
        capability: request.capability,
        ref: request.connectorRef,
      })
    }

    const providerConfig = await this.options.providerConfigResolver?.(request.connectorRef)
    const credential: ConnectorResolvedCredential = {
      accessToken,
      providerConfig: providerConfig ?? undefined,
    }
    return adapter.execute(request, credential)
  }
}

export function createConnectorOperationExecutor(options: ConnectorRuntimeOptions): ConnectorOperationExecutor {
  return new ConnectorRuntime(options).execute
}

export function createDefaultConnectorAdapters(): ConnectorOperationAdapter[] {
  return [
    mockAdapter('notion'),
    mockAdapter('google'),
    mockAdapter('asana'),
    mockAdapter('monday'),
    mockAdapter('zapier'),
    mockAdapter('slack'),
    mockAdapter('github'),
    mockAdapter('jira'),
    mockAdapter('linear'),
    customHttpAdapter(),
  ]
}

function mockAdapter(provider: ConnectorProvider): ConnectorOperationAdapter {
  return {
    provider,
    async execute(request) {
      return {
        mediaType: 'json',
        text: `[${provider}:${request.operation}]`,
        data: {
          provider,
          capability: request.capability,
          operation: request.operation,
          ok: true,
          mock: true,
          request: maskSensitiveFields(request.params),
        },
        durationMs: 0,
      }
    },
  }
}

function customHttpAdapter(): ConnectorOperationAdapter {
  return {
    provider: 'custom_http',
    async execute(request, credential) {
      const url = String(request.params['url'] ?? '')
      const providerConfig = credential?.providerConfig ?? {}
      const allowlistedOrigins = arrayOfStrings(providerConfig['allowlistedOrigins'])
      const allowlistedHosts = arrayOfStrings(providerConfig['allowlistedHosts'])
      const urlCheck = validateCustomHttpUrl(url, {
        allowlistedOrigins,
        allowlistedHosts,
        httpsOnly: true,
      })
      if (!urlCheck.ok) {
        return connectorError(urlCheck.reason, { provider: 'custom_http' })
      }

      const headers = sanitizeCustomHttpHeaders(
        (request.params['headers'] as Record<string, unknown> | undefined) ?? {},
      )

      return {
        mediaType: 'json',
        text: `[Custom HTTP: ${urlCheck.url.origin}]`,
        data: {
          provider: 'custom_http',
          operation: request.operation,
          ok: true,
          mock: true,
          method: String(request.params['method'] ?? 'POST').toUpperCase(),
          url: urlCheck.url.toString(),
          headers,
          body: maskSensitiveFields(request.params['body']),
          response: {
            status: 202,
            body: { accepted: true },
          },
        },
        durationMs: 0,
      }
    },
  }
}

function connectorError(code: string, detail: Record<string, unknown>): ExecutionResult {
  return {
    mediaType: 'json',
    text: '',
    data: {
      error: code,
      ...(maskSensitiveFields(detail) as Record<string, unknown>),
    },
    durationMs: 0,
  }
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
