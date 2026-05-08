import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../../lib/http'
import { createServiceSupabaseClient } from '../../lib/supabase'

interface HealthResponseOk {
  status: 'ok'
  db: true
  uptime_s: number
  version: string | null
  checked_at: string
}

interface HealthResponseDegraded {
  status: 'degraded'
  db: false
  uptime_s: number
  version: string | null
  checked_at: string
  reason: string
}

const VERSION =
  process.env['PLATFORM_API_VERSION']
    ?? process.env['GIT_SHA']
    ?? process.env['SOURCE_VERSION']
    ?? null

const DB_PROBE_TIMEOUT_MS = 1500

interface DbProbeResult {
  ok: boolean
  reason: string | null
}

async function probeDatabase(): Promise<DbProbeResult> {
  const client = createServiceSupabaseClient()
  const probe = client.rpc('fn_health')

  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new Error('db_probe_timeout')), DB_PROBE_TIMEOUT_MS)
  })

  try {
    const result = (await Promise.race([probe, timeout])) as {
      data: number | null
      error: { message?: string } | null
    }
    if (result.error) {
      return { ok: false, reason: result.error.message ?? 'db_probe_failed' }
    }
    if (result.data !== 1) {
      return { ok: false, reason: 'unexpected_health_value' }
    }
    return { ok: true, reason: null }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

export async function handleHealthRoute(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const checkedAt = new Date().toISOString()
  const probe = await probeDatabase()

  if (probe.ok) {
    const body: HealthResponseOk = {
      status: 'ok',
      db: true,
      uptime_s: Math.floor(process.uptime()),
      version: VERSION,
      checked_at: checkedAt,
    }
    sendJson(res, 200, body)
    return
  }

  const body: HealthResponseDegraded = {
    status: 'degraded',
    db: false,
    uptime_s: Math.floor(process.uptime()),
    version: VERSION,
    checked_at: checkedAt,
    reason: probe.reason ?? 'db_probe_failed',
  }
  sendJson(res, 503, body)
}
