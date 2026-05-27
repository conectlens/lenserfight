import { describe, expect, it, vi } from 'vitest'

import { createClientFromRpc } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

describe('ProtocolClient', () => {
  it('getContractByVersion calls fn_sdk_get_contract with version_id', async () => {
    const contract = { contentHash: 'abc', body: { requiredScopes: [] } }
    const rpc: SupabaseLikeRpcClient = { rpc: vi.fn(async () => ({ data: contract, error: null })) }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getContractByVersion('v1')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_get_contract', { p_version_id: 'v1', p_content_hash: null })
    expect(result).toEqual(contract)
  })

  it('getContractByHash calls fn_sdk_get_contract with content_hash', async () => {
    const rpc: SupabaseLikeRpcClient = { rpc: vi.fn(async () => ({ data: null, error: null })) }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getContractByHash('deadbeef')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_get_contract', { p_version_id: null, p_content_hash: 'deadbeef' })
    expect(result).toBeNull()
  })

  it('getManifest calls fn_sdk_get_manifest', async () => {
    const manifest = { specVersion: '1.0.0', contentHash: 'abc' }
    const rpc: SupabaseLikeRpcClient = { rpc: vi.fn(async () => ({ data: manifest, error: null })) }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getManifest('v1')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_get_manifest', { p_version_id: 'v1' })
    expect(result).toEqual(manifest)
  })

  it('getDependencies calls fn_sdk_get_dependencies', async () => {
    const edges = [{ parentContentHash: 'a', childContentHash: 'b', binding: 'lift', depth: 1 }]
    const rpc: SupabaseLikeRpcClient = { rpc: vi.fn(async () => ({ data: edges, error: null })) }
    const lf = createClientFromRpc(rpc)
    const result = await lf.protocols.getDependencies('abc123')
    expect(rpc.rpc).toHaveBeenCalledWith('fn_sdk_get_dependencies', { p_content_hash: 'abc123' })
    expect(result).toEqual(edges)
  })

  it('checkCompatibility is client-side logic', async () => {
    const contract = { contentHash: 'x', body: { requiredScopes: ['read', 'write'] } }
    const rpc: SupabaseLikeRpcClient = { rpc: vi.fn(async () => ({ data: contract, error: null })) }
    const lf = createClientFromRpc(rpc)

    const compat = await lf.protocols.checkCompatibility('x', ['read'])
    expect(compat.compatible).toBe(true)
    expect(compat.missingScopes).toEqual([])

    const incompat = await lf.protocols.checkCompatibility('x', ['read', 'admin'])
    expect(incompat.compatible).toBe(false)
    expect(incompat.missingScopes).toEqual(['admin'])
  })
})
