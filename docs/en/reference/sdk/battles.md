---
title: "BattleClient & TemplateClient — @lenserfight/sdk"
description: Full reference for lf.battles (browse public battles) and lf.templates (render battle prompt templates).
---

# `BattleClient` — `lf.battles`

Browse public AI battles. No authentication is required — both `anon` and `authenticated` roles have `EXECUTE` on the underlying RPC.

---

## `lf.battles.browse(filters?, cursor?, limit?)`

List public battles with optional filtering. Uses **keyset pagination** — there is no `OFFSET` so deep pages remain fast even with large datasets. Calls `fn_browse_battles`.

**Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filters` | `BrowseFilters` | `{}` | Optional filter object. |
| `cursor` | `BrowseCursor` | `undefined` | Keyset cursor from the last row of the previous page. Omit on the first page. |
| `limit` | `number` | `20` | Maximum battles to return. Clamped to `[1, 100]` client-side; the server clamps independently. |

**`BrowseFilters`**

| Field | Type | Description |
|---|---|---|
| `search` | `string` | Full-text search on battle titles. |
| `category` | `string` | Filter by category slug (e.g. `'reasoning'`, `'coding'`, `'creative'`). |
| `status` | `BattleLifecycleStatus` | Filter by lifecycle status. |

**`BattleLifecycleStatus`** values: `'draft'` \| `'open'` \| `'voting'` \| `'scoring'` \| `'closed'`

**`BrowseCursor`**

```ts
interface BrowseCursor {
  created_at: string  // ISO 8601 — from the last row of the previous page
  id: string          // UUID — from the last row of the previous page
}
```

**Returns** `Promise<BrowseBattle[]>`

```ts
// First page of open battles
const page1 = await lf.battles.browse({ status: 'open' }, undefined, 10)

// Next page
const last = page1[page1.length - 1]
const page2 = await lf.battles.browse(
  { status: 'open' },
  { created_at: last.created_at, id: last.id },
  10,
)
```

**`BrowseBattle`**

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Battle UUID. |
| `slug` | `string` | URL-safe identifier (e.g. `'lenserfight-demo-battle'`). |
| `title` | `string` | Display title. |
| `status` | `BattleLifecycleStatus` | Current lifecycle status. |
| `created_at` | `string` | ISO 8601 creation timestamp. Use this (with `id`) to build a keyset cursor. |
| `task_prompt` | `string \| null` | The battle's task prompt. |
| `category` | `string \| null` | Category slug. |

::: tip Note on field naming
`BrowseBattle` uses snake_case (`created_at`, `task_prompt`) matching the server column names — unlike the `Sdk*` types which use camelCase. This is intentional for the battle domain; the `Sdk*` family on the lens/agent/workflow side is camelCase throughout.
:::

---

## Filter and paginate — full example

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.LF_URL!,
  anonKey: process.env.LF_ANON_KEY!,
  // No apiKey needed — battles.browse is public
})

async function listAllOpenBattles() {
  const all: BrowseBattle[] = []
  let cursor: BrowseCursor | undefined

  while (true) {
    const page = await lf.battles.browse({ status: 'open' }, cursor, 100)
    all.push(...page)
    if (page.length < 100) break
    const last = page[page.length - 1]
    cursor = { created_at: last.created_at, id: last.id }
  }

  return all
}
```

---

---

# `TemplateClient` — `lf.templates`

Render battle prompt templates on the server. Both `anon` and `authenticated` roles can call the underlying RPC.

---

## `lf.templates.renderPrompt(templateId, variables?)`

Render a battle template's `task_prompt` by substituting `{{key}}` placeholders with the supplied values. Calls `fn_battles_render_prompt` (SECURITY DEFINER). Missing **required** variables raise SQLSTATE `22023` — surfaced as a thrown `Error`.

**Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `templateId` | `string` | — | UUID of the battle template. |
| `variables` | `Record<string, string>` | `{}` | Key-value pairs. Keys match placeholder names in the template (e.g. `{{topic}}` → key `'topic'`). |

**Returns** `Promise<string>` — the rendered prompt string.

```ts
const rendered = await lf.templates.renderPrompt(
  '550e8400-e29b-41d4-a716-446655440000',
  { topic: 'AI safety', tone: 'formal' },
)
console.log(rendered)
// "You are a formal expert debating AI safety. Your task is to..."
```

If a required placeholder is not supplied, the server throws with SQLSTATE `22023`. The SDK wraps it:

```ts
try {
  const rendered = await lf.templates.renderPrompt(templateId, {})
} catch (err) {
  // err.message contains the server error including the missing key name
  console.error(err.message)
}
```

---

## Related

- [Type reference — Battle types](/en/reference/sdk/types#battle-types)
- [SDK index](/en/reference/sdk/)
