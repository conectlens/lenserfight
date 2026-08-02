import { beforeEach, describe, expect, it, vi } from 'vitest'

const callRpc = vi.fn()

vi.mock('@lenserfight/cli-client', () => ({ callRpc: (...args: unknown[]) => callRpc(...args) }))

import { createLensRunAdapter } from './lens-adapter'

const LENS_ID = '45000000-0001-0004-0001-000000000001'

beforeEach(() => {
  callRpc.mockReset()
})

describe('createLensRunAdapter', () => {
  it('exposes the expected id and metadata', () => {
    const adapter = createLensRunAdapter()
    expect(adapter.id()).toBe('lf_lens_run')
    expect(adapter.metadata().mirrorsMcpTool).toBe('run_lens')
  })

  it('resolves the template and substitutes param values', async () => {
    callRpc.mockResolvedValueOnce({
      title: 'Greeting',
      description: null,
      template_body: 'Hello [[:name]]!',
      parameters: [{ id: 'name', label: 'Name', optional: false }],
      version_id: 'v1',
    })

    const { execute } = createLensRunAdapter().toToolDefinition()
    const result = await execute({ lens_id: LENS_ID, param_values: { Name: 'World' } }, {} as never)

    expect(callRpc).toHaveBeenCalledWith(
      'fn_mcp_lens_resolve_template',
      { p_lens_id: LENS_ID, p_version_id: null },
      { requireAuth: true },
    )
    expect(result).toEqual({
      title: 'Resolved lens: Greeting',
      output: 'Hello World!',
      metadata: { lens_id: LENS_ID, version_id: 'v1' },
    })
  })

  it('reports missing required params instead of calling', async () => {
    callRpc.mockResolvedValueOnce({
      title: 'Greeting',
      description: null,
      template_body: 'Hello [[:name]]!',
      parameters: [{ id: 'name', label: 'Name', optional: false }],
      version_id: 'v1',
    })

    const { execute } = createLensRunAdapter().toToolDefinition()
    const result = await execute({ lens_id: LENS_ID, param_values: {} }, {} as never)

    expect(result).toBe('Lens "Greeting" needs 1 more parameter(s): Name.')
  })

  it('reports not-found lenses', async () => {
    callRpc.mockResolvedValueOnce(null)

    const { execute } = createLensRunAdapter().toToolDefinition()
    const result = await execute({ lens_id: LENS_ID, param_values: {} }, {} as never)

    expect(result).toBe(`Lens ${LENS_ID} not found.`)
  })
})
