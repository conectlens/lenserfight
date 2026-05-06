// Supabase Edge Function: send-battle-result-email
//
// Purpose: Send battle result notification emails to participants and voters.
// Invoked via pg_net from fn_notify_battle_result after a battle publishes.
// Requires RESEND_API_KEY in Supabase Secrets. Gracefully degrades if absent.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_ADDRESS = Deno.env.get('BATTLE_EMAIL_FROM') ?? 'LenserFight Battles <battles@lenserfight.com>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://lenserfight.com'

interface RequestPayload {
  battle_id: string
  battle_title: string
  battle_slug: string
  winner_name: string | null
  recipient_emails: string[] | null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: RequestPayload
  try {
    payload = await req.json() as RequestPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { battle_title, battle_slug, winner_name, recipient_emails } = payload

  if (!recipient_emails || recipient_emails.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!RESEND_API_KEY) {
    // Graceful degradation in local dev / when key not configured
    console.warn('RESEND_API_KEY not set — skipping email dispatch')
    return new Response(JSON.stringify({ sent: 0, reason: 'no_api_key' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resultUrl = `${APP_URL}/battles/${battle_slug}/result`
  const outcomeText = winner_name ? `Winner: ${winner_name}` : 'Result: Draw'

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Battle Result</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #f0f0f0; margin: 0; padding: 32px 16px; }
    .card { max-width: 480px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 32px; border: 1px solid #2a2a2a; }
    .badge { display: inline-block; background: #f5c518; color: #0f0f0f; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 20px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #fff; }
    p { font-size: 14px; color: #aaa; margin: 0 0 24px; line-height: 1.6; }
    .outcome { font-size: 16px; font-weight: 600; color: #f5c518; margin-bottom: 24px; }
    .btn { display: inline-block; background: #f5c518; color: #0f0f0f; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; }
    .footer { margin-top: 28px; font-size: 11px; color: #555; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Battle Concluded</div>
    <h1>${escapeHtml(battle_title)}</h1>
    <p>The battle has ended and the votes have been counted.</p>
    <p class="outcome">${escapeHtml(outcomeText)}</p>
    <a href="${resultUrl}" class="btn">View Full Results</a>
    <div class="footer">You received this because you participated in or voted on this battle.</div>
  </div>
</body>
</html>`

  const emailText = `Battle concluded: ${battle_title}\n\n${outcomeText}\n\nView results: ${resultUrl}`

  // Send to all recipients in batches of 50 (Resend batch limit)
  const batches: string[][] = []
  for (let i = 0; i < recipient_emails.length; i += 50) {
    batches.push(recipient_emails.slice(i, i + 50))
  }

  let totalSent = 0
  for (const batch of batches) {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        batch.map((to) => ({
          from: FROM_ADDRESS,
          to,
          subject: `Battle result: ${battle_title}`,
          html: emailHtml,
          text: emailText,
        }))
      ),
    })

    if (res.ok) {
      totalSent += batch.length
    } else {
      const err = await res.text()
      console.error('Resend batch error:', err)
    }
  }

  return new Response(JSON.stringify({ sent: totalSent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
