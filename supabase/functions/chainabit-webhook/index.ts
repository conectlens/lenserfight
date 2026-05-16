// Supabase Edge Function: chainabit-webhook
//
// Receives signed webhook events from Chainabit and routes them:
//   - wallet.credit_added  → broadcast to Supabase Realtime so WalletContext refetches
//   - provision.claimed    → upsert lenser profile from provisioned Chainabit account
//
// Requires secrets: CHAINABIT_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('CHAINABIT_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const sig = req.headers.get('x-chainabit-signature')
  if (!sig || !WEBHOOK_SECRET) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return sig === expected
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()

  if (!(await verifySignature(req, body))) {
    return new Response('Unauthorized', { status: 401 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  try {
    switch (event.event) {
      case 'wallet.credit_added': {
        const lenserId = event.data['lenser_id'] as string | undefined
        if (lenserId) {
          await supabase.channel(`wallet:${lenserId}`).send({
            type: 'broadcast',
            event: 'balance_updated',
            payload: { credits_added: event.data['credits_added'] },
          })
        }
        break
      }

      case 'provision.claimed': {
        // Intentionally not handled: LenserFight profiles must be created through
        // the standard user-initiated onboarding flow, not server-side provisioning.
        // Users who want to connect their Chainabit wallet do so explicitly from
        // Settings → Partner Accounts.
        break
      }

      default:
        // Unknown event type — accept and ignore so Chainabit doesn't retry
        break
    }
  } catch (err) {
    console.error(`[chainabit-webhook] Error handling event ${event.event}:`, err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
