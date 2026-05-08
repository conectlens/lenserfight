// TODO(V3+): Pre-warm cache on `battle.finalized` event (consume U1 events).
// On-demand cache headers (5 min browser / 10 min CDN) are sufficient for V3 launch.
//
// TODO(V3+): Upgrade to @vercel/og (or satori + resvg) for PNG output once
// the bundle-size policy permits. SVG is universally rasterized by social
// crawlers (Slack, Discord, Twitter, LinkedIn, Facebook), so SVG is a safe
// MVP choice that avoids adding a new dependency.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../../lib/http'
import { createServiceSupabaseClient } from '../../lib/supabase'

interface BattleRow {
  id: string
  slug: string
  title: string | null
  status: string | null
  finalized_at: string | null
  winner_contender_id: string | null
  deleted_at: string | null
  total_vote_count: number | null
}

interface ContenderRow {
  id: string
  slot: string
  display_name: string | null
}

interface EloLogRow {
  winner_score_before: number | null
  winner_score_after: number | null
  loser_score_before: number | null
  loser_score_after: number | null
  is_draw: boolean | null
}

interface CardData {
  slug: string
  title: string
  status: string
  finalized: boolean
  contenderA: { name: string; isWinner: boolean; eloDelta: number | null }
  contenderB: { name: string; isWinner: boolean; eloDelta: number | null }
  totalVotes: number
}

/**
 * Escapes user-controlled strings for inclusion as SVG text content or
 * attribute values. Required because we render SVG literal markup.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Truncate a string to `max` chars, appending an ellipsis when shortened. */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, Math.max(0, max - 1)) + '…'
}

function renderShareCardSvg(data: CardData): string {
  const title = escapeXml(truncate(data.title, 64))
  const a = data.contenderA
  const b = data.contenderB
  const aName = escapeXml(truncate(a.name, 24))
  const bName = escapeXml(truncate(b.name, 24))
  const aColor = a.isWinner ? '#fde047' : '#e2e8f0'
  const bColor = b.isWinner ? '#fde047' : '#e2e8f0'
  const aDelta = a.eloDelta !== null && data.finalized
    ? `${a.eloDelta >= 0 ? '+' : ''}${Math.round(a.eloDelta)} ELO`
    : ''
  const bDelta = b.eloDelta !== null && data.finalized
    ? `${b.eloDelta >= 0 ? '+' : ''}${Math.round(b.eloDelta)} ELO`
    : ''
  const footer = escapeXml(`lenserfight.com/battles/${data.slug}`)
  const statusBadge = data.finalized ? 'FINALIZED' : escapeXml(data.status.toUpperCase())
  const votesLine = data.finalized
    ? `${data.totalVotes} vote${data.totalVotes === 1 ? '' : 's'}`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0f17"/>
      <stop offset="55%" stop-color="#101725"/>
      <stop offset="100%" stop-color="#1d1330"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>
  <g font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" fill="#f8fafc">
    <text x="60" y="80" font-size="32" font-weight="700" fill="url(#accent)">LenserFight</text>
    <text x="1140" y="80" font-size="20" font-weight="600" fill="#94a3b8" text-anchor="end">${statusBadge}</text>
    <text x="600" y="240" font-size="56" font-weight="800" text-anchor="middle">${title}</text>
    <g transform="translate(60, 340)">
      <text x="0" y="0" font-size="36" font-weight="700" fill="${aColor}">${aName}</text>
      <text x="0" y="40" font-size="22" font-weight="500" fill="#94a3b8">${escapeXml(aDelta)}</text>
    </g>
    <text x="600" y="370" font-size="48" font-weight="800" text-anchor="middle" fill="#64748b">vs</text>
    <g transform="translate(1140, 340)">
      <text x="0" y="0" font-size="36" font-weight="700" fill="${bColor}" text-anchor="end">${bName}</text>
      <text x="0" y="40" font-size="22" font-weight="500" fill="#94a3b8" text-anchor="end">${escapeXml(bDelta)}</text>
    </g>
    <text x="600" y="470" font-size="24" font-weight="500" fill="#cbd5e1" text-anchor="middle">${escapeXml(votesLine)}</text>
    <text x="60" y="580" font-size="22" font-weight="500" fill="#64748b">${footer}</text>
  </g>
</svg>`
}

async function fetchCardData(slug: string): Promise<CardData | null> {
  const client = createServiceSupabaseClient()

  const { data: battleRows, error: battleErr } = await client
    .schema('battles')
    .from('battles')
    .select('id,slug,title,status,finalized_at,winner_contender_id,deleted_at,total_vote_count')
    .eq('slug', slug)
    .limit(1)

  if (battleErr) throw new Error(battleErr.message)

  const battle = (Array.isArray(battleRows) ? battleRows[0] : null) as BattleRow | null
  if (!battle) return null

  // Visibility: drafts and soft-deleted battles are not publicly shareable.
  if (battle.deleted_at !== null) return null
  if (battle.status === 'draft') return null

  const { data: contenderRows, error: contErr } = await client
    .schema('battles')
    .from('contenders')
    .select('id,slot,display_name')
    .eq('battle_id', battle.id)
    .order('slot', { ascending: true })

  if (contErr) throw new Error(contErr.message)

  const contenders = (contenderRows ?? []) as ContenderRow[]
  const a = contenders.find((c) => c.slot === 'A') ?? contenders[0]
  const b = contenders.find((c) => c.slot === 'B') ?? contenders[1]

  const finalized = !!battle.finalized_at
  const winnerId = battle.winner_contender_id

  let aDelta: number | null = null
  let bDelta: number | null = null

  if (finalized) {
    const { data: eloRows } = await client
      .schema('reputation')
      .from('elo_battle_log')
      .select('winner_score_before,winner_score_after,loser_score_before,loser_score_after,is_draw')
      .eq('battle_id', battle.id)
      .limit(1)

    const elo = (Array.isArray(eloRows) ? eloRows[0] : null) as EloLogRow | null
    if (elo && !elo.is_draw && elo.winner_score_before !== null && elo.winner_score_after !== null) {
      const winnerDelta = Number(elo.winner_score_after) - Number(elo.winner_score_before)
      const loserDelta =
        elo.loser_score_before !== null && elo.loser_score_after !== null
          ? Number(elo.loser_score_after) - Number(elo.loser_score_before)
          : null
      const aIsWinner = !!a && a.id === winnerId
      const bIsWinner = !!b && b.id === winnerId
      if (aIsWinner) {
        aDelta = winnerDelta
        bDelta = loserDelta
      } else if (bIsWinner) {
        bDelta = winnerDelta
        aDelta = loserDelta
      }
    }
  }

  return {
    slug: battle.slug,
    title: battle.title ?? 'Untitled Battle',
    status: battle.status ?? 'draft',
    finalized,
    contenderA: {
      name: a?.display_name ?? 'Contender A',
      isWinner: !!a && a.id === winnerId,
      eloDelta: aDelta,
    },
    contenderB: {
      name: b?.display_name ?? 'Contender B',
      isWinner: !!b && b.id === winnerId,
      eloDelta: bDelta,
    },
    totalVotes: battle.total_vote_count ?? 0,
  }
}

/**
 * GET /v1/battles/<slug>/share-card.<ext>
 *
 * Returns a 1200x630 SVG OG image suitable for social-card crawlers
 * (Slack, Discord, Twitter, LinkedIn, Facebook all rasterize SVG). When the
 * battle is missing, deleted, or still a draft, returns 404 + JSON.
 */
export async function handleBattleShareCardRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  parts: string[],
): Promise<void> {
  // parts: ['v1', 'battles', '<slug>', 'share-card.<ext>']
  const slug = parts[2]
  const file = parts[3] ?? ''

  if (!slug || !file.startsWith('share-card.')) {
    sendJson(res, 404, { error: 'not_found', message: 'Battle share card not found.' })
    return
  }

  let data: CardData | null
  try {
    data = await fetchCardData(slug)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    sendJson(res, 500, { error: 'share_card_failed', message })
    return
  }

  if (!data) {
    sendJson(res, 404, { error: 'not_found', message: 'Battle share card not found.' })
    return
  }

  const svg = renderShareCardSvg(data)
  res.statusCode = 200
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600')
  res.end(svg)
}
