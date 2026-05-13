---
title: SDK Quickstart — build your first integration
description: 10-step walkthrough that takes you from `npm install` to a working LenserFight battle browser in under five minutes.
---

# Build your first integration with `@lenserfight/sdk`

This page walks you from a clean Node project to a working LenserFight integration. It covers the alpha SDK at `0.1.0-alpha.1` (Phase BW).

By the end you will have:

- A Node project with `@lenserfight/sdk` installed
- A typed client created against a local Supabase
- A "browse open battles" output in your terminal

::: warning Alpha
The SDK surface may shift before `1.0.0`. Pin to a specific alpha tag and re-read the [CHANGELOG](https://github.com/conectlens/lenserfight/blob/main/CHANGELOG.md) before upgrading.
:::

## 1. Spin up a local LenserFight

If you do not have a LenserFight already running, clone the repo and start one:

```bash
git clone https://github.com/conectlens/lenserfight
cd lenserfight
pnpm install --frozen-lockfile
supabase start                  # boots Postgres on :54322 + PostgREST on :54321
pnpm supabase:db:reset          # applies the migrations + seed
```

The seed includes three public battles in `open` status — perfect for our walkthrough.

## 2. Capture the local credentials

```bash
supabase status
```

Note:

- `API URL` → use as `SUPABASE_URL` (default: `http://localhost:54321`)
- `anon key` → use as `SUPABASE_ANON_KEY`

## 3. Start a new Node project

```bash
mkdir lf-quickstart && cd lf-quickstart
pnpm init -y
pnpm add @lenserfight/sdk@alpha
pnpm add -D typescript tsx @types/node
npx tsc --init --module nodenext --target es2022 --moduleResolution nodenext
```

## 4. Write the smallest possible client

Create `src/main.ts`:

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!,
})

const battles = await lf.battles.browse({ status: 'open' }, undefined, 5)
console.log(`Found ${battles.length} open battles:`)
for (const b of battles) {
  console.log(`  • ${b.title} (${b.slug})`)
}
```

## 5. Run it

```bash
SUPABASE_URL=http://localhost:54321 \
SUPABASE_ANON_KEY=<paste from step 2> \
pnpm tsx src/main.ts
```

Expected output:

```
Found 3 open battles:
  • LenserFight Demo Battle (lenserfight-demo-battle)
  • Reasoning Quality Shootout (reasoning-quality-shootout)
  • Creative Caption Showdown (creative-caption-showdown)
```

## 6. Paginate

```ts
const PAGE = 2
const page1 = await lf.battles.browse({ status: 'open' }, undefined, PAGE)
const last = page1[page1.length - 1]
const page2 = await lf.battles.browse(
  { status: 'open' },
  { created_at: last.created_at, id: last.id },
  PAGE,
)
console.log('page 1:', page1.map(b => b.slug))
console.log('page 2:', page2.map(b => b.slug))
```

The cursor is built from the last row of the previous page. There is no `OFFSET` — pagination is keyset, so deep pages stay fast.

## 7. Filter

```ts
await lf.battles.browse({ status: 'voting' })            // by status
await lf.battles.browse({ category: 'reasoning' })       // by category
await lf.battles.browse({ search: 'caption' })           // full-text on title
```

Filters compose — pass multiple keys at once.

## 8. Render a template prompt

```ts
const rendered = await lf.templates.renderPrompt(
  'aaaa1111-b301-aaaa-aaaa-aaaaaaaaaaaa',
  { topic: 'AI safety', tone: 'formal' },
)
console.log(rendered)
```

The SDK calls `fn_battles_render_prompt` on the server. Missing required variables raise SQLSTATE `22023` — surfaced as a thrown `Error` with the failing key in the message.

## 9. Bring your own RPC client (optional)

If your app already has a Supabase JS client, hand it to the SDK directly:

```ts
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClientFromRpc } from '@lenserfight/sdk'

const supabase = createSupabase(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
const lf = createClientFromRpc(supabase)
```

This skips the SDK's bundled fetch client. Useful for sharing auth state, retries, or telemetry with the rest of your app.

## 10. Ship it

```bash
# Build
pnpm tsc

# Deploy to your runtime of choice
# (Node 18+, Cloudflare Workers, Vercel functions, etc.)
```

The SDK is ESM-only at runtime (with a CJS fallback in the build output). It runs anywhere `globalThis.fetch` is available.

## Next steps

- [SDK reference](/en/reference/sdk/) — full method-by-method docs
- [RPC reference](/en/reference/database/rpc-reference) — server-side details of `fn_browse_battles` and other public RPCs
- [GitHub Discussions → SDK feedback](https://github.com/conectlens/lenserfight/discussions/categories/sdk) — the channel for alpha feedback

If something on this page breaks, [open an issue](https://github.com/conectlens/lenserfight/issues/new) and reference `Phase BW — SDK quickstart`.
