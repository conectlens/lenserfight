---
title: SDK Quickstart — build your first integration
description: Connect to LenserFight Cloud or a local instance, install the SDK, and browse battles in under five minutes.
---

# Build your first integration with `@lenserfight/sdk`

This page takes you from a clean Node project to a working LenserFight integration using the alpha SDK at `0.1.0-alpha.1`.

By the end you will have:

- `@lenserfight/sdk` installed in a Node project
- A typed client pointed at LenserFight
- A "browse open battles" output in your terminal

::: warning Alpha
The SDK surface may shift before `1.0.0`. Pin to a specific alpha tag and re-read the [CHANGELOG](https://github.com/conectlens/lenserfight/blob/main/CHANGELOG.md) before upgrading.
:::

## 1. Choose your connection mode

::: tip Cloud or Local?
**Cloud** — connect to an existing hosted LenserFight Supabase project. No local setup needed; skip straight to capturing credentials below.

**Local** — run LenserFight on your own machine via Supabase CLI. Choose this for development, testing, or self-hosting.
:::

::: tabs
== Cloud

You need the **API URL** and **anon key** for your hosted Supabase project.

Find them in the Supabase dashboard under **Settings → API**:

- **Project URL** → use as `LENSERFIGHT_URL`
- **Project API key → anon / public** → use as `LENSERFIGHT_ANON_KEY`

> Never use the `service_role` key in client-side or public code.

== Local

Clone the repo and start a local Supabase instance:

```bash
git clone https://github.com/conectlens/lenserfight
cd lenserfight
pnpm install --frozen-lockfile
supabase start                  # boots Postgres on :54322 + PostgREST on :54321
pnpm supabase:db:reset          # applies migrations + seed
```

Then capture your local credentials:

```bash
supabase status
```

Note:

- `API URL` → use as `LENSERFIGHT_URL` (default: `http://localhost:54321`)
- `anon key` → use as `LENSERFIGHT_ANON_KEY`

The seed includes three public battles in `open` status — ready for the walkthrough.
:::

## 2. Create a Node project

```bash
mkdir lf-quickstart && cd lf-quickstart
pnpm init -y
pnpm add @lenserfight/sdk@alpha
pnpm add -D typescript tsx @types/node
npx tsc --init --module nodenext --target es2022 --moduleResolution nodenext
```

## 3. Write the smallest possible client

Create `src/main.ts`:

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.LENSERFIGHT_URL!,
  anonKey: process.env.LENSERFIGHT_ANON_KEY!,
})

const battles = await lf.battles.browse({ status: 'open' }, undefined, 5)
console.log(`Found ${battles.length} open battles:`)
for (const b of battles) {
  console.log(`  • ${b.title} (${b.slug})`)
}
```

## 4. Run it

```bash
LENSERFIGHT_URL=<your URL> \
LENSERFIGHT_ANON_KEY=<your anon key> \
pnpm tsx src/main.ts
```

Expected output (local seed):

```
Found 3 open battles:
  • LenserFight Demo Battle (lenserfight-demo-battle)
  • Reasoning Quality Shootout (reasoning-quality-shootout)
  • Creative Caption Showdown (creative-caption-showdown)
```

## 5. Paginate

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

The cursor is built from the last row of the previous page. Pagination is keyset — deep pages stay fast with no `OFFSET`.

## 6. Filter

```ts
await lf.battles.browse({ status: 'voting' })        // by status
await lf.battles.browse({ category: 'reasoning' })   // by category
await lf.battles.browse({ search: 'caption' })       // full-text on title
```

Filters compose — pass multiple keys at once.

## 7. Render a template prompt

```ts
const rendered = await lf.templates.renderPrompt(
  'aaaa1111-b301-aaaa-aaaa-aaaaaaaaaaaa',
  { topic: 'AI safety', tone: 'formal' },
)
console.log(rendered)
```

The SDK calls `fn_battles_render_prompt` on the server. Missing required variables raise SQLSTATE `22023`, surfaced as a thrown `Error` with the failing key in the message.

## 8. Bring your own Supabase client (optional)

If your app already has a Supabase JS client, pass it directly:

```ts
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClientFromRpc } from '@lenserfight/sdk'

const supabase = createSupabase(process.env.LENSERFIGHT_URL!, process.env.LENSERFIGHT_ANON_KEY!)
const lf = createClientFromRpc(supabase)
```

This skips the SDK's bundled fetch client — useful for sharing auth state, retries, or telemetry with the rest of your app.

## 9. Ship it

```bash
# Type-check and compile
pnpm tsc

# Deploy to your runtime of choice
# Node 18+, Cloudflare Workers, Vercel functions, etc.
```

The SDK is ESM-first with a CJS fallback. It runs anywhere `globalThis.fetch` is available.

## Next steps

- [SDK reference](/en/reference/sdk/) — full method-by-method docs
- [RPC reference](/en/reference/database/rpc-reference) — server-side details for `fn_browse_battles` and other public RPCs
- [GitHub Discussions → SDK feedback](https://github.com/conectlens/lenserfight/discussions/categories/sdk) — the channel for alpha feedback

If something on this page breaks, [open an issue](https://github.com/conectlens/lenserfight/issues/new).
