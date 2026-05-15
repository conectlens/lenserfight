// test-provider — Supabase Edge Function (Deno runtime)
//
// Validates a stored BYOK API key against the real provider endpoint and
// persists the health check result to agents.provider_configs.
//
// Flow:
//   1. Validate POST + Authorization header
//   2. Parse { ai_lenser_id, provider_key } body
//   3. User client → fn_get_provider_configs to verify ownership + get ai_key_id
//   4. Service client → ai.keys to get encrypted_key_id for the ai_key_id
//   5. Service client → vault.decrypted_secrets to retrieve the raw API key
//   6. Probe the provider with a minimal authenticated request
//   7. Service client → fn_upsert_provider_config to persist status
//   8. Return { status: 'healthy' | 'error', message: string }
//
// Environment variables (injected by Supabase runtime):
//   SUPABASE_URL              — project REST API base URL
//   SUPABASE_ANON_KEY         — anon key (for user-scoped ownership check)
//   SUPABASE_SERVICE_ROLE_KEY — service role JWT (vault read + status write)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TestProviderBody {
  ai_lenser_id: string
  provider_key: string
}

interface ProviderConfigRow {
  provider_key: string
  ai_key_id: string | null
  base_url: string | null
}

interface AiKeyRow {
  encrypted_key_id: string
}

interface DecryptedSecretRow {
  decrypted_secret: string
}

// Local-only providers have no public cloud API to probe. Without a
// caller-supplied base_url the test cannot reach a running daemon from the
// Edge Function runtime, so we report a deterministic "local_only" result
// instead of leaking a DNS failure.
const LOCAL_ONLY_PROVIDERS = new Set(['ollama', 'lmstudio', 'localai', 'llamacpp'])

// Minimal probe endpoints — just enough to confirm the key is accepted.
// Returns HTTP 200/2xx on a valid key; 401/403 on an invalid key.
async function probeProvider(
  providerKey: string,
  apiKey: string,
  baseUrl: string | null
): Promise<{ ok: boolean; message: string }> {
  type ProbeConfig = {
    url: string
    headers: Record<string, string>
  }

  // Local provider handling — only probe if the user supplied a reachable
  // base_url. Otherwise short-circuit with an actionable message.
  if (LOCAL_ONLY_PROVIDERS.has(providerKey)) {
    if (!baseUrl) {
      return {
        ok: false,
        message:
          `${providerKey} is a local provider — set base_url (e.g. http://localhost:11434) before testing.`,
      }
    }

    const localUrl =
      providerKey === 'ollama'
        ? `${baseUrl.replace(/\/$/, '')}/api/tags`
        : `${baseUrl.replace(/\/$/, '')}/v1/models`
    const localHeaders: Record<string, string> = apiKey
      ? { Authorization: `Bearer ${apiKey}` }
      : {}

    try {
      const res = await fetch(localUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...localHeaders },
        signal: AbortSignal.timeout(8_000),
      })
      if (res.ok) {
        return { ok: true, message: `${providerKey} daemon responded successfully.` }
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: 'Local provider rejected the supplied key.' }
      }
      return { ok: false, message: `Local provider returned HTTP ${res.status}.` }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('timed out') || msg.includes('AbortError')) {
        return { ok: false, message: 'Local provider connection timed out (8s).' }
      }
      // DNS / network errors on local endpoints: caller likely set an
      // unreachable host. Surface that explicitly instead of "name resolution failed".
      return {
        ok: false,
        message:
          `Local provider unreachable from server: ${msg}. Local daemons must be exposed publicly or tested from the client.`,
      }
    }
  }

  const probeMap: Record<string, ProbeConfig> = {
    anthropic: {
      url: 'https://api.anthropic.com/v1/models',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    },
    openai: {
      url: `${baseUrl ?? 'https://api.openai.com'}/v1/models`,
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    google: {
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      headers: {},
    },
    mistral: {
      url: 'https://api.mistral.ai/v1/models',
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    fal: {
      url: 'https://rest.alpha.fal.ai/v1/models',
      headers: { Authorization: `Key ${apiKey}` },
    },
    elevenlabs: {
      url: 'https://api.elevenlabs.io/v1/models',
      headers: { 'xi-api-key': apiKey },
    },
    stability: {
      url: 'https://api.stability.ai/v1/engines/list',
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  }

  const probe = probeMap[providerKey]
  if (!probe && !baseUrl) {
    return {
      ok: false,
      message: `Unknown provider "${providerKey}" — set base_url to enable a custom probe.`,
    }
  }

  const probeUrl =
    probe?.url ??
    `${baseUrl!.replace(/\/$/, '')}/v1/models`
  const probeHeaders: Record<string, string> = probe?.headers ?? {
    Authorization: `Bearer ${apiKey}`,
  }

  try {
    const res = await fetch(probeUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...probeHeaders },
      signal: AbortSignal.timeout(8_000),
    })

    if (res.ok) {
      return { ok: true, message: 'Provider responded successfully.' }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Invalid API key — authentication rejected.' }
    }
    return { ok: false, message: `Provider returned HTTP ${res.status}.` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timed out') || msg.includes('AbortError')) {
      return { ok: false, message: 'Provider connection timed out (8s).' }
    }
    return { ok: false, message: `Connection failed: ${msg}` }
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'missing_authorization' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  let body: TestProviderBody
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: JSON_HEADERS }
    )
  }

  const { ai_lenser_id, provider_key } = body
  if (!ai_lenser_id || !provider_key) {
    return new Response(
      JSON.stringify({ error: 'missing_required_fields' }),
      { status: 400, headers: JSON_HEADERS }
    )
  }

  // ── Step 3: Ownership check + config lookup ─────────────────────────────────
  // Using the caller's JWT so RLS + can_manage_ai_lenser enforces ownership.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: configs, error: ownershipError } = await userClient.rpc(
    'fn_get_provider_configs',
    { p_ai_lenser_id: ai_lenser_id }
  )

  if (ownershipError) {
    return new Response(
      JSON.stringify({ error: 'forbidden', detail: ownershipError.message }),
      { status: 403, headers: JSON_HEADERS }
    )
  }

  const config = (configs as ProviderConfigRow[] | null)?.find(
    (c) => c.provider_key === provider_key
  )

  if (!config?.ai_key_id) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Provider not configured — save an API key first.',
      }),
      { status: 200, headers: JSON_HEADERS }
    )
  }

  // ── Step 4-5: Read vault secret via service role ────────────────────────────
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Resolve and decrypt the API key in one RPC call
  const { data: keyRows, error: keyErr } = await serviceClient.rpc('fn_worker_get_ai_key_secret', {
    p_ai_key_id: config.ai_key_id,
  })

  if (keyErr || !keyRows?.[0]?.decrypted_secret) {
    console.error('key resolution failed', keyErr)
    return new Response(
      JSON.stringify({ status: 'error', message: 'Failed to locate or decrypt key.' }),
      { status: 200, headers: JSON_HEADERS }
    )
  }

  const secret = { decrypted_secret: keyRows[0].decrypted_secret }

  // ── Step 6: Live provider probe ─────────────────────────────────────────────
  const result = await probeProvider(
    provider_key,
    secret.decrypted_secret,
    config.base_url
  )

  // ── Step 7: Persist health check result ────────────────────────────────────
  const { error: upsertErr } = await serviceClient.rpc('fn_upsert_provider_config', {
    p_ai_lenser_id: ai_lenser_id,
    p_provider_key: provider_key,
    p_base_url: config.base_url ?? null,
    p_status: result.ok ? 'healthy' : 'error',
    p_ai_key_id: config.ai_key_id,
  })

  if (upsertErr) {
    console.error('fn_upsert_provider_config failed', upsertErr)
  }

  // ── Step 8: Return result ───────────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      status: result.ok ? 'healthy' : 'error',
      message: result.message,
    }),
    { status: 200, headers: JSON_HEADERS }
  )
})
