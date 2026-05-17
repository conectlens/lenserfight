// Phase AM — async-media-poll-worker spec.
//
// We mock the supabase client + provider-status module to exercise the
// three branches: completed → fn_async_run_idempotent_complete called;
// failed → runs.update with status='failed'; pending → no writes.

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))
jest.mock('../lib/provider-status', () => ({
  checkProviderStatus: jest.fn(),
}))

import { createServiceSupabaseClient } from '../lib/supabase'
import { checkProviderStatus } from '../lib/provider-status'
import { pollAsyncMediaBatch } from './async-media-poll-worker'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>
const mockCheck  = checkProviderStatus as jest.MockedFunction<typeof checkProviderStatus>

interface MockBuilder {
  rpc: jest.Mock
  from: jest.Mock
  schema: jest.Mock
}

function buildClient(claimedRows: unknown[]): MockBuilder {
  const updateEq = jest.fn().mockResolvedValue({ data: null, error: null })
  const update = jest.fn().mockReturnValue({ eq: updateEq })
  const from = jest.fn().mockReturnValue({ update })
  const rpc = jest.fn(async (fnName: string) => {
    if (fnName === 'fn_poll_async_run') {
      return { data: claimedRows, error: null }
    }
    if (fnName === 'fn_async_run_idempotent_complete') {
      return { data: true, error: null }
    }
    return { data: null, error: null }
  })
  const schema = jest.fn().mockReturnValue({ rpc, from })
  return { rpc, from, schema }
}

describe('pollAsyncMediaBatch', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns zeros when no rows are claimed', async () => {
    const { schema, rpc, from } = buildClient([])
    mockCreate.mockReturnValue({ schema, rpc, from } as never)

    const result = await pollAsyncMediaBatch()

    expect(result).toEqual({ polled: 0, completed: 0, failed: 0 })
    expect(mockCheck).not.toHaveBeenCalled()
  })

  it('calls fn_async_run_idempotent_complete for completed rows', async () => {
    const { schema, rpc, from } = buildClient([
      {
        run_id: 'run-1',
        provider_task_id: 'task-1',
        model_key: 'fal-ai/flux/dev',
        provider_key: 'fal',
        output_modality: 'image',
        started_at: new Date().toISOString(),
      },
    ])
    mockCreate.mockReturnValue({ schema, rpc, from } as never)
    mockCheck.mockResolvedValueOnce({
      state: 'completed',
      mediaUrl: 'https://fal.example/out.png',
      mimeType: 'image/png',
    })

    const result = await pollAsyncMediaBatch()

    expect(result).toEqual({ polled: 1, completed: 1, failed: 0 })
    expect(rpc).toHaveBeenCalledWith(
      'fn_async_run_idempotent_complete',
      expect.objectContaining({
        p_run_id: 'run-1',
        p_media_url: 'https://fal.example/out.png',
        p_mime_type: 'image/png',
      }),
    )
  })

  it('marks runs failed when provider reports failure', async () => {
    const { schema, rpc, from } = buildClient([
      {
        run_id: 'run-2',
        provider_task_id: 'task-2',
        model_key: 'fal-ai/wan/t2v',
        provider_key: 'fal',
        output_modality: 'video',
        started_at: new Date().toISOString(),
      },
    ])
    mockCreate.mockReturnValue({ schema, rpc, from } as never)
    mockCheck.mockResolvedValueOnce({
      state: 'failed',
      errorCode: 'fal_failed',
      errorMessage: 'fal status: FAILED',
    })

    const result = await pollAsyncMediaBatch()

    expect(result).toEqual({ polled: 1, completed: 0, failed: 1 })
    expect(rpc).toHaveBeenCalledWith(
      'fn_worker_fail_execution_run',
      expect.objectContaining({ p_run_id: 'run-2' }),
    )
  })

  it('does not write when state is pending', async () => {
    const { schema, rpc, from } = buildClient([
      {
        run_id: 'run-3',
        provider_task_id: 'task-3',
        model_key: 'fal-ai/flux/dev',
        provider_key: 'fal',
        output_modality: 'image',
        started_at: new Date().toISOString(),
      },
    ])
    mockCreate.mockReturnValue({ schema, rpc, from } as never)
    mockCheck.mockResolvedValueOnce({ state: 'pending' })

    const result = await pollAsyncMediaBatch()

    expect(result).toEqual({ polled: 1, completed: 0, failed: 0 })
    // Only fn_poll_async_run was called; no completion/update calls.
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(from).not.toHaveBeenCalled()
  })

  it('continues processing other rows when one fails', async () => {
    const { schema, rpc, from } = buildClient([
      {
        run_id: 'run-a',
        provider_task_id: 'task-a',
        model_key: 'fal-ai/flux/dev',
        provider_key: 'fal',
        output_modality: 'image',
        started_at: new Date().toISOString(),
      },
      {
        run_id: 'run-b',
        provider_task_id: 'task-b',
        model_key: 'fal-ai/flux/dev',
        provider_key: 'fal',
        output_modality: 'image',
        started_at: new Date().toISOString(),
      },
    ])
    mockCreate.mockReturnValue({ schema, rpc, from } as never)
    mockCheck.mockRejectedValueOnce(new Error('network blip'))
    mockCheck.mockResolvedValueOnce({
      state: 'completed',
      mediaUrl: 'https://fal.example/b.png',
      mimeType: 'image/png',
    })

    const result = await pollAsyncMediaBatch()

    expect(result.polled).toBe(2)
    // The first row's failure does not abort the whole tick; the second row
    // still completes.
    expect(result.completed).toBe(1)
  })
})
