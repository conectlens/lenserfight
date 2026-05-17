import { describe, expect, it, vi } from 'vitest'
import { createConnectorOperationExecutor } from './connector-runtime'

describe('ConnectorRuntime', () => {
  it('resolves credentials server-side and returns sanitized mocked output', async () => {
    const resolver = { resolve: vi.fn(async () => 'secret-token') }
    const execute = createConnectorOperationExecutor({ credentialResolver: resolver })

    const result = await execute({
      connectorRef: 'google.sheets.primary',
      provider: 'google',
      capability: 'sheets',
      operation: 'read_range',
      requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
      params: { spreadsheetId: 'sheet-id', range: 'Sheet1!A1:B2' },
    })

    expect(resolver.resolve).toHaveBeenCalledWith('google.sheets.primary', ['https://www.googleapis.com/auth/spreadsheets'])
    expect(JSON.stringify(result)).not.toContain('secret-token')
    expect(result.data).toMatchObject({ provider: 'google', operation: 'read_range', ok: true })
  })

  it('returns explicit unavailable errors for metadata-only operations', async () => {
    const execute = createConnectorOperationExecutor({
      credentialResolver: { resolve: vi.fn(async () => 'secret-token') },
    })

    const result = await execute({
      connectorRef: 'gitlab.repos.primary',
      provider: 'gitlab',
      capability: 'repos',
      operation: 'read_project_metadata',
      requiredScopes: ['read_api'],
      params: {},
    })

    expect(result.data?.['error']).toBe('connector_operation_unavailable')
  })

  it('enforces Custom HTTP allowlists before returning output', async () => {
    const execute = createConnectorOperationExecutor({
      credentialResolver: { resolve: vi.fn(async () => 'secret-token') },
      providerConfigResolver: vi.fn(async () => ({ allowlistedHosts: ['example.com'] })),
    })

    const blocked = await execute({
      connectorRef: 'custom_http.http.primary',
      provider: 'custom_http',
      capability: 'http',
      operation: 'send_request',
      requiredScopes: ['custom_http:send'],
      params: { url: 'https://127.0.0.1/hook' },
    })
    expect(blocked.data?.['error']).toBe('private_or_metadata_host_blocked')

    const allowed = await execute({
      connectorRef: 'custom_http.http.primary',
      provider: 'custom_http',
      capability: 'http',
      operation: 'send_request',
      requiredScopes: ['custom_http:send'],
      params: { url: 'https://example.com/hook', headers: { Authorization: 'secret', Accept: 'application/json' } },
    })
    expect(allowed.data?.['ok']).toBe(true)
    expect(JSON.stringify(allowed.data)).not.toContain('Authorization')
  })
})
