---
title: "@lenserfight/sdk reference"
description: Public SDK surface for LenserFight Community Edition — alpha line at 0.1.0-alpha.1.
---

# `@lenserfight/sdk` reference

::: warning Alpha
This SDK is at `0.1.0-alpha.1` (Phase BW). Surface may change before `1.0.0`. Pin to a specific alpha tag in production and follow the [CHANGELOG](https://github.com/conectlens/lenserfight/blob/main/CHANGELOG.md) for breaking-change notices.
:::

## Install

```bash
npm install @lenserfight/sdk@alpha
# or
pnpm add @lenserfight/sdk@alpha
```

## Create a client

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.SUPABASE_URL!,          // https://<project>.supabase.co
  anonKey: process.env.SUPABASE_ANON_KEY!, // anon/publishable key only
})
```

### `CreateClientOptions`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` | yes | Supabase project URL. `localhost:54321` for a local install. |
| `anonKey` | `string` | yes | Publishable/anonymous key. **Never** pass a service-role key. |
| `fetch` | `typeof fetch` | no | Custom fetch implementation. Defaults to `globalThis.fetch`. |

## `BattleClient`

### `lf.battles.browse(filters?, cursor?, limit?)`

Calls `public.fn_browse_battles` (SECURITY DEFINER, EXECUTE granted to anon + authenticated). Returns at most `limit` battles, ordered `(created_at DESC, id DESC)`.

| Argument | Type | Description |
|----------|------|-------------|
| `filters` | `BrowseFilters` | `{ search?, category?, status? }` — all optional. `status` constrained to lifecycle states. |
| `cursor` | `BrowseCursor` | `{ created_at, id }` from the last row of the previous page. |
| `limit` | `number` | Clamped to `[1, 100]` client-side; the server clamps too. |

```ts
const page1 = await lf.battles.browse({ status: 'open' }, undefined, 20)
const last = page1[page1.length - 1]
const page2 = await lf.battles.browse(
  { status: 'open' },
  { created_at: last.created_at, id: last.id },
  20,
)
```

Returns `BrowseBattle[]`:

```ts
interface BrowseBattle {
  id: string
  slug: string
  title: string
  status: 'draft' | 'open' | 'voting' | 'scoring' | 'closed'
  created_at: string
  task_prompt?: string | null
  category?: string | null
}
```

## `TemplateClient`

### `lf.templates.renderPrompt(templateId, variables)`

Calls `public.fn_battles_render_prompt`. Variables are interpolated into the template's `task_prompt` (`{{key}}` substitution). Missing required variables raise SQLSTATE `22023` — surfaced as a thrown `Error`.

```ts
const prompt = await lf.templates.renderPrompt(
  '550e8400-e29b-41d4-a716-446655440000',
  { topic: 'reasoning', tone: 'formal' },
)
```

## Escape hatch — `lf.rpcCall`

For RPCs not yet on the typed surface:

```ts
const verdict = await lf.rpcCall<{ winner: string }>(
  'fn_battles_get_ai_verdict',
  { p_battle_id: battleId },
)
```

The escape hatch is unstable — anything used widely should be promoted to a typed client method. Open an issue with the use case.

## Bring your own RPC client

`createClientFromRpc` accepts any object conforming to `SupabaseLikeRpcClient`. Useful when the host app already manages a `@supabase/supabase-js` instance:

```ts
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClientFromRpc } from '@lenserfight/sdk'

const supabase = createSupabase(url, anonKey)
const lf = createClientFromRpc(supabase)
```

## Versioning

- `0.1.0-alpha.*` — preview surface, breaking changes allowed at any time
- `0.x.y` — stable surface for the alpha line; breaking changes bump `x`
- `1.0.0` — committed public surface, breaking changes require a major bump

See [maintainers](https://github.com/conectlens/lenserfight/blob/main/MAINTAINERS.md) for the SDK release sign-off path.

## Related

- [SDK quickstart](/en/how-to/integrations/sdk-quickstart) — 10-step walkthrough
- [Connector SDK](/en/reference/connectors/index) — the separate `@lenserfight/adapter-connector` package for building inbound connectors
- [RPC reference](/en/reference/database/rpc-reference) — server-side details of all public RPCs including `fn_browse_battles`
