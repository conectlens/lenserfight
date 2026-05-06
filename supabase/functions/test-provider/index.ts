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
  const probeUrl =
    probe?.url ??
    `${baseUrl ?? `https://api.${providerKey}.com`}/v1/models`
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

  // Get the vault secret id from ai.keys
  const { data: keyRow, error: keyErr } = await serviceClient
    .schema('ai')
    .from('keys')
    .select('encrypted_key_id')
    .eq('id', config.ai_key_id)
    .maybeSingle<AiKeyRow>()

  if (keyErr || !keyRow?.encrypted_key_id) {
    console.error('ai.keys lookup failed', keyErr)
    return new Response(
      JSON.stringify({ status: 'error', message: 'Failed to locate key reference.' }),
      { status: 200, headers: JSON_HEADERS }
    )
  }

  // Decrypt via vault.decrypted_secrets view (service role only)
  const { data: secret, error: vaultErr } = await serviceClient
    .schema('vault')
    .from('decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', keyRow.encrypted_key_id)
    .maybeSingle<DecryptedSecretRow>()

  if (vaultErr || !secret?.decrypted_secret) {
    console.error('vault decryption failed', vaultErr)
    return new Response(
      JSON.stringify({ status: 'error', message: 'Failed to decrypt stored key.' }),
      { status: 200, headers: JSON_HEADERS }
    )
  }

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
