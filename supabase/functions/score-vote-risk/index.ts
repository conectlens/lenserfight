// score-vote-risk — Supabase Edge Function (Deno runtime)
//
// Receives a vote payload from the reputation.fn_seed_vote_risk() trigger via
// pg_net and computes an anti-fraud risk score based on three signals:
//   1. burst_votes      — voter cast > 10 votes in the last hour
//   2. draw_rate_anomaly — voter's draw rate exceeds 50% (platform avg ≈ 10%)
//   3. new_account      — lenser account is < 7 days old
//
// Risk score thresholds:
//   < 0.30  → review_status = 'cleared'
//   0.30–0.69 → review_status = 'flagged'   (manual review queue)
//   ≥ 0.70  → review_status = 'excluded'  (vote removed from aggregation)
//
// Updates reputation.vote_risk_scores via the Supabase service-role client.
//
// Environment variables (automatically injected by Supabase):
//   SUPABASE_URL              — project REST API base URL
//   SUPABASE_SERVICE_ROLE_KEY — service role JWT (bypasses RLS)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface VoteRiskPayload {
  vote_id: string
  battle_id: string
  voter_id: string
  voted_for: string
  vote_value: string
  is_draw: boolean
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let payload: VoteRiskPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { vote_id, voter_id } = payload

  if (!vote_id || !voter_id) {
    return new Response(JSON.stringify({ error: 'missing_required_fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // ── Signal 1: Burst votes ─────────────────────────────────────────────────
    // Voter cast more than 10 votes in the last 60 minutes.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .schema('battles')
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('voter_lenser_id', voter_id)
      .gte('created_at', oneHourAgo)

    const burstSignal = (recentCount ?? 0) > 10

    // ── Signal 2: Draw-rate anomaly ───────────────────────────────────────────
    // Only evaluate once the voter has cast at least 5 votes to avoid
    // false positives on new voters.
    const { count: totalVotes } = await supabase
      .schema('battles')
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('voter_lenser_id', voter_id)

    const { count: totalDraws } = await supabase
      .schema('battles')
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('voter_lenser_id', voter_id)
      .eq('is_draw', true)

    const drawRate =
      (totalVotes ?? 0) >= 5
        ? (totalDraws ?? 0) / Math.max(totalVotes ?? 1, 1)
        : 0
    const drawAnomalySignal = drawRate > 0.5

    // ── Signal 3: New account ─────────────────────────────────────────────────
    // Accounts created within the last 7 days are weighted as higher risk.
    const { data: lenser } = await supabase
      .from('lensers')
      .select('created_at')
      .eq('id', voter_id)
      .maybeSingle()

    const accountAgeMs = lenser?.created_at
      ? Date.now() - new Date(lenser.created_at).getTime()
      : Infinity
    const newAccountSignal = accountAgeMs < 7 * 24 * 60 * 60 * 1000

    // ── Aggregate risk score ──────────────────────────────────────────────────
    const riskFactors: string[] = []
    let riskScore = 0

    if (burstSignal) {
      riskFactors.push('burst_votes')
      riskScore += 0.5
    }
    if (drawAnomalySignal) {
      riskFactors.push('draw_rate_anomaly')
      riskScore += 0.25
    }
    if (newAccountSignal) {
      riskFactors.push('new_account')
      riskScore += 0.15
    }

    riskScore = Math.min(Math.round(riskScore * 10000) / 10000, 1.0)

    // ── Map to review_status ──────────────────────────────────────────────────
    const reviewStatus: string =
      riskScore >= 0.7 ? 'excluded' : riskScore >= 0.3 ? 'flagged' : 'cleared'

    // ── Persist results ───────────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .schema('reputation')
      .from('vote_risk_scores')
      .update({
        risk_score: riskScore,
        risk_factors: riskFactors,
        review_status: reviewStatus,
      })
      .eq('vote_id', vote_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ risk_score: riskScore, risk_factors: riskFactors, review_status: reviewStatus }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('score-vote-risk error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
