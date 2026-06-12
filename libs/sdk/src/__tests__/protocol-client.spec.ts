import { describe, expect, it, vi } from 'vitest'

import { createClientFromRpc } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

describe('ProtocolClient', () => {
  it('getContractByVersion calls fn_get_version_contracts and maps input_contract to body', async () => {
    const contractBody = { specVersion: '1.0.0', requiredScopes: ['read'] }
    const rpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({
        data: [{ version_id: 'v1', input_contract: contractBody, output_contract: null }],
        error: null,
      })),
    }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getContractByVersion('v1')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_get_version_contracts', { p_version_id: 'v1' })
    expect(result).not.toBeNull()
    expect(result!.body).toEqual(contractBody)
  })

  it('getContractByVersion returns null when no input_contract', async () => {
    const rpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({
        data: [{ version_id: 'v1', input_contract: null, output_contract: null }],
        error: null,
      })),
    }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getContractByVersion('v1')
    expect(result).toBeNull()
  })

  it('getContractByHash returns null without making any RPC call', async () => {
    const rpc: SupabaseLikeRpcClient = { rpc: vi.fn(async () => ({ data: null, error: null })) }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getContractByHash('deadbeef')
    expect(rpc.rpc).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('getManifest builds manifest from fn_get_version_contracts', async () => {
    const contractBody = { specVersion: '1.0.0', requiredScopes: [] }
    const rpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({
        data: [{ version_id: 'v1', input_contract: contractBody, output_contract: null }],
        error: null,
      })),
    }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getManifest('v1')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_get_version_contracts', { p_version_id: 'v1' })
    expect(result).not.toBeNull()
    expect(result!.body).toEqual(contractBody)
    expect(result!.channel).toBeNull()
    expect(result!.signatures).toEqual([])
  })

  it('getManifest returns null when version has no contract', async () => {
    const rpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
    }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getManifest('v-missing')
    expect(result).toBeNull()
  })

  it('getDependencies returns empty array without any RPC call', async () => {
    const rpc: SupabaseLikeRpcClient = { rpc: vi.fn(async () => ({ data: null, error: null })) }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getDependencies('abc123')
    expect(rpc.rpc).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  it('checkCompatibility uses fn_get_version_contracts and compares scopes', async () => {
    const contractBody = { specVersion: '1.0.0', requiredScopes: ['read', 'write'] }
    const rpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({
        data: [{ version_id: 'v1', input_contract: contractBody, output_contract: null }],
        error: null,
      })),
    }
    const lf = createClientFromRpc(rpc)

    const compat = await lf.protocols.checkCompatibility('v1', ['read'])
    expect(compat.compatible).toBe(true)
    expect(compat.missingScopes).toEqual([])

    const incompat = await lf.protocols.checkCompatibility('v1', ['read', 'admin'])
    expect(incompat.compatible).toBe(false)
    expect(incompat.missingScopes).toEqual(['admin'])
  })

  it('checkCompatibility returns not-compatible when contract not found', async () => {
    const rpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
    }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.checkCompatibility('v-missing', ['read'])
    expect(result.compatible).toBe(false)
    expect(result.warnings).toContain('Contract not found')
  })
})
