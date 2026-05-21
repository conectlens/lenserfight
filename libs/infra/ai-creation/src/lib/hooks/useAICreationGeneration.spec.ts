import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAICreationGeneration } from './useAICreationGeneration'
import type { GenerateCreationResponse, GenerateCreationErrorResponse } from '../creation.types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock supabase + getCachedAccessToken
vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: {
        default_ai_funding_source: 'platform_credit',
        ai_provider_key: 'openai',
        ai_model_key: 'gpt-4o-mini',
        selected_api_key_id: null,
        default_ai_local_key_id: null,
      },
      error: null,
    }),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }) },
  },
  getCachedAccessToken: vi.fn().mockReturnValue('test-token'),
}))

// Mock global fetch for edge function calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper to create a server response
function serverResponse(body: GenerateCreationResponse | GenerateCreationErrorResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const SUCCESS_LENS_RESPONSE: GenerateCreationResponse = {
  ok: true,
  mode: 'prompted',
  output: {
    type: 'lens',
    result: {
      title: 'Generated Lens',
      content: 'Instructions for [[topic]].',
      description: 'A useful lens.',
      suggestedTagSlugs: ['writing'],
      params: [{ label: 'topic' }],
    },
  },
}

const SUCCESS_WORKFLOW_RESPONSE: GenerateCreationResponse = {
  ok: true,
  mode: 'recommendation',
  output: {
    type: 'workflow',
    result: {
      title: 'Generated Workflow',
      description: 'A useful workflow.',
      suggestedLensIds: ['lens-a'],
    },
  },
}

describe('useAICreationGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue(serverResponse(SUCCESS_LENS_RESPONSE))
  })

  it('returns isGenerating=false and no error initially', () => {
    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets isGenerating=true during generation, then false after', async () => {
    let resolveCall!: () => void
    mockFetch.mockReturnValue(new Promise<Response>((res) => { resolveCall = () => res(serverResponse(SUCCESS_LENS_RESPONSE)) }))

    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )

    let generatePromise: Promise<unknown>
    act(() => { generatePromise = result.current.generate('test prompt') })
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(result.current.isGenerating).toBe(true)

    act(() => resolveCall())
    await act(async () => { await generatePromise })
    expect(result.current.isGenerating).toBe(false)
  })

  it('returns lens output on successful prompted generation', async () => {
    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )
    let output: unknown
    await act(async () => { output = await result.current.generate('create a lens') })
    expect(output).toMatchObject({ type: 'lens', result: { title: 'Generated Lens' } })
    expect(result.current.lastMode).toBe('prompted')
  })

  it('returns workflow output on recommendation generation (no prompt)', async () => {
    mockFetch.mockResolvedValue(serverResponse(SUCCESS_WORKFLOW_RESPONSE))
    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'workflow', context: {} }),
    )
    let output: unknown
    await act(async () => { output = await result.current.generate(null) })
    expect(output).toMatchObject({ type: 'workflow', result: { title: 'Generated Workflow' } })
    expect(result.current.lastMode).toBe('recommendation')
  })

  it('sets error and returns null on server error response', async () => {
    const errorResponse: GenerateCreationErrorResponse = {
      ok: false,
      error: { code: 'PROVIDER_ERROR', message: 'Provider failed.' },
    }
    mockFetch.mockResolvedValue(serverResponse(errorResponse, 502))

    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )
    let output: unknown
    await act(async () => { output = await result.current.generate('test') })
    expect(output).toBeNull()
    expect(result.current.error?.code).toBe('PROVIDER_ERROR')
  })

  it('sets error and returns null when profileId is empty', async () => {
    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: '', generationType: 'lens', context: {} }),
    )
    let output: unknown
    await act(async () => { output = await result.current.generate('test') })
    expect(output).toBeNull()
    expect(result.current.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns PROMPT_TOO_LONG error without calling server when prompt > MAX_LENGTH', async () => {
    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )
    const longPrompt = 'x'.repeat(2001)
    let output: unknown
    await act(async () => { output = await result.current.generate(longPrompt) })
    expect(output).toBeNull()
    expect(result.current.error?.code).toBe('PROMPT_TOO_LONG')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('sets TIMEOUT error on AbortError', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValue(abortError)

    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )
    await act(async () => { await result.current.generate('test') })
    expect(result.current.error?.code).toBe('TIMEOUT')
  })

  it('resetError clears the error state', async () => {
    const errorResponse: GenerateCreationErrorResponse = {
      ok: false,
      error: { code: 'PROVIDER_ERROR', message: 'Provider failed.' },
    }
    mockFetch.mockResolvedValue(serverResponse(errorResponse, 502))

    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )
    await act(async () => { await result.current.generate('test') })
    expect(result.current.error).not.toBeNull()

    act(() => result.current.resetError())
    expect(result.current.error).toBeNull()
  })

  it('clears error from previous attempt at start of new generate call', async () => {
    // First call fails
    mockFetch.mockResolvedValueOnce(serverResponse({ ok: false, error: { code: 'PROVIDER_ERROR', message: 'fail' } } as GenerateCreationErrorResponse, 502))
    const { result } = renderHook(() =>
      useAICreationGeneration({ profileId: 'user-1', generationType: 'lens', context: {} }),
    )
    await act(async () => { await result.current.generate('test') })
    expect(result.current.error).not.toBeNull()

    // Second call succeeds — error should clear
    mockFetch.mockResolvedValueOnce(serverResponse(SUCCESS_LENS_RESPONSE))
    await act(async () => { await result.current.generate('test2') })
    expect(result.current.error).toBeNull()
  })

  it('routes local BYOK through AICreationService (edge function URL not called)', async () => {
    vi.mocked((await import('@lenserfight/data/supabase')).supabase.rpc).mockResolvedValueOnce({
      data: {
        default_ai_funding_source: 'user_byok_local',
        ai_provider_key: 'openai',
        ai_model_key: 'gpt-4o-mini',
        selected_api_key_id: null,
        default_ai_local_key_id: 'local-key-id',
      },
      error: null,
    })
    // Mock callProvider's fetch to return a valid lens response
    const lensJson = JSON.stringify({ title: 'T', content: 'c'.repeat(20), description: 'd', suggestedTagSlugs: [], params: [] })
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: lensJson } }],
    }), { status: 200 }))

    const resolveLocalKey = vi.fn().mockResolvedValue('sk-local')
    const { result } = renderHook(() =>
      useAICreationGeneration({
        profileId: 'user-1',
        generationType: 'lens',
        context: {},
        resolveLocalKey,
      }),
    )
    await act(async () => { await result.current.generate('test') })

    // The edge function URL must not have been called — only the provider URL (openai) was
    const edgeFunctionCalls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('/functions/v1/generate-creation'),
    )
    expect(edgeFunctionCalls).toHaveLength(0)
  })
})
