---
title: "Battle Share-Card API"
description: "GET /v1/battles/:slug/share-card.svg — the 1200×630 social share card endpoint used by BattleSEOHead's og:image. SVG today, PNG tracked as a follow-up."
---

# Battle Share-Card API

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


The share-card endpoint renders a 1200×630 social-card SVG for a single battle. It is the surface `BattleSEOHead` points `og:image` at, so every public battle URL gets a crawler-ready preview without any client-side rendering.

The endpoint is implemented by `apps/platform-api/src/http/routes/battles-share-card.route.ts` and is mounted on the platform API.

---

## Endpoint

```
GET /v1/battles/:slug/share-card.svg
```

| Aspect | Value |
|---|---|
| Auth | None — public surface |
| Path param | `slug` — the battle slug (matches `battles.battles.slug`) |
| Method | `GET` |
| Visibility | Public for battles whose `status` is not `draft` and `deleted_at IS NULL`. Drafts and soft-deleted battles return 404. |

---

## Responses

### `200 OK`

```
Content-Type: image/svg+xml; charset=utf-8
Cache-Control: public, max-age=300, s-maxage=600
```

Body is a complete SVG document (`<?xml version="1.0" ?><svg ...>`). The card is fixed at 1200×630 to match the standard Open Graph / Twitter image aspect ratio. Browsers, Slack, Discord, Twitter/X, LinkedIn, and Facebook all rasterize SVG correctly when fetching `og:image`.

### `404 Not Found`

```json
{ "error": "not_found", "message": "Battle share card not found." }
```

Returned for an unknown slug, a soft-deleted battle (`deleted_at IS NOT NULL`), or a battle still in `draft`.

### `500 Internal Server Error`

```json
{ "error": "share_card_failed", "message": "<reason>" }
```

Returned when the underlying Supabase query throws. The route deliberately surfaces the error message string for debugging; nothing in the data path is user-controlled at this point.

---

## Card content

The SVG renders a single composite layout. The fields below are pulled from `battles.battles`, `battles.contenders`, and `reputation.elo_battle_log`:

| Element | Source |
|---|---|
| Header badge | Constant `LenserFight` wordmark |
| Status badge (top right) | Uppercased `status`, or the literal `FINALIZED` once `finalized_at IS NOT NULL` |
| Title | `battles.title`, truncated to 64 characters |
| Contender A name | `contenders.display_name` for `slot='A'`, truncated to 24 characters |
| Contender B name | `contenders.display_name` for `slot='B'`, truncated to 24 characters |
| Winner highlight | The winning contender's name renders in the highlight color when `winner_contender_id` is set |
| ELO delta lines | `reputation.elo_battle_log` deltas. Rendered only when the battle is finalized. Sign and rounded integer (e.g. `+18 ELO`, `-12 ELO`). |
| Vote line | `total_vote_count` votes — only when the battle is finalized |
| Footer | `lenserfight.com/battles/<slug>` |

All user-controlled strings are escaped for safe inclusion as SVG text content (`&`, `<`, `>`, `"`, `'`).

---

## Embedding

`BattleSEOHead` already wires the URL into Open Graph and Twitter card meta tags:

```html
<meta property="og:image" content="https://api.lenserfight.com/v1/battles/csv-parser-2026/share-card.svg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://api.lenserfight.com/v1/battles/csv-parser-2026/share-card.svg" />
```

Consumers should not need to call this endpoint directly; visiting any battle detail URL surfaces the card automatically.

---

## Caching

Responses set `Cache-Control: public, max-age=300, s-maxage=600`. Five minutes browser, ten minutes CDN. The endpoint has no per-request user state, so it caches cleanly behind any reverse proxy.

There is no on-write cache invalidation today. A `battle.finalized` event-driven pre-warm is tracked as a follow-up (see "Future" below).

---

## Future

The route file carries two TODOs:

- **Pre-warm cache on `battle.finalized`** — consume Phase U1 events to invalidate and re-fetch the card the moment a battle finalizes. Today the on-demand cache headers are the only freshness mechanism.
- **PNG upgrade** — switch from raw SVG to `@vercel/og` (or `satori` + `resvg`) for native PNG output. SVG is universally rasterized by social crawlers, so SVG is a safe MVP. The PNG migration is a bundle-size / dependency decision, not a correctness one. Tracked in [Known Limitations → Battles](/en/reference/known-limitations#battles).

---

## Related

- [Rematches, Replays, and Series](/en/explanation/battles/rematches-and-series)
- [How to: rematch and series](/en/how-to/battles/rematch-and-series)
- [Known Limitations → Battles](/en/reference/known-limitations#battles)
- Source: `apps/platform-api/src/http/routes/battles-share-card.route.ts`
