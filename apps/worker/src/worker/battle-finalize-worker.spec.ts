// Unit tests for the battle-finalize worker poller (F2).
//
// The worker is a thin Controller: it calls the service-role RPC
// fn_worker_run_finalize_cycle and does NOTHING else (no per-battle fan-out,
// no direct .from('battles') — the battles schema is not REST-exposed). These
// tests pin that contract and the error/interval behavior, mirroring the mock
// style of battle-worker.spec.ts.

const mockRpc = jest.fn()

jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(() => {
    const from = jest.fn()
    const schema = jest.fn().mockReturnValue({ rpc: mockRpc, from })
    return { rpc: mockRpc, from, schema }
  }),
}))

jest.mock('@lenserfight/utils/logger', () => ({
  nodeLogger: { info: jest.fn(), error: jest.fn() },
}))

import { createServiceSupabaseClient } from '../lib/supabase'
import { runBattleFinalizeCycle, startBattleFinalizeWorker } from './battle-finalize-worker'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>

describe('battle-finalize-worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: 0, error: null })
  })

  describe('runBattleFinalizeCycle', () => {
    it('invokes fn_worker_run_finalize_cycle exactly once and returns the count', async () => {
      mockRpc.mockResolvedValueOnce({ data: 3, error: null })

      const result = await runBattleFinalizeCycle()

      expect(result).toBe(3)
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith('fn_worker_run_finalize_cycle')
    })

    it('goes through the RPC only — never svc.from(battles) / svc.schema(battles)', async () => {
      mockRpc.mockResolvedValueOnce({ data: 2, error: null })

      await runBattleFinalizeCycle()

      const client = mockCreate.mock.results[0].value as {
        from: jest.Mock
        schema: jest.Mock
      }
      // Direct .from('battles') hits non-existent public.battles and silently
      // returns 0 rows — the worker must rely solely on the RPC.
      expect(client.from).not.toHaveBeenCalled()
      expect(client.schema).not.toHaveBeenCalled()
    })

    it('returns 0 and does NOT throw when the RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

      await expect(runBattleFinalizeCycle()).resolves.toBe(0)
    })

    it('coerces null data to 0', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null })

      await expect(runBattleFinalizeCycle()).resolves.toBe(0)
    })

    it('issues exactly ONE RPC regardless of batch size (no per-battle fan-out)', async () => {
      mockRpc.mockResolvedValueOnce({ data: 1000, error: null })

      const result = await runBattleFinalizeCycle()

      expect(result).toBe(1000)
      expect(mockRpc).toHaveBeenCalledTimes(1)
    })
  })

  describe('startBattleFinalizeWorker', () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    it('ticks once on start, schedules on the interval, and returns a working stop fn', async () => {
      jest.useFakeTimers()
      const setIntervalSpy = jest.spyOn(global, 'setInterval')
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      const stop = startBattleFinalizeWorker()

      // tick-on-start fires immediately
      await Promise.resolve()
      expect(mockRpc).toHaveBeenCalledTimes(1)

      // scheduled at the BATTLE_FINALIZE_INTERVAL_MS default (60_000 ms)
      expect(setIntervalSpy).toHaveBeenCalledTimes(1)
      expect(setIntervalSpy.mock.calls[0][1]).toBe(60000)

      // returned cleanup clears the timer
      stop()
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    })
  })
})
