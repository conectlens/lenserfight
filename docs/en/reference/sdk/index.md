---
title: "@lenserfight/sdk reference"
description: Complete API reference for the LenserFight TypeScript/JavaScript SDK — clients, methods, parameters, and types.
---

# `@lenserfight/sdk` reference

::: warning Alpha
This SDK is at `0.1.0-alpha.1` (Phase BW). The surface may change before `1.0.0`. Pin to a specific alpha tag in production and follow the [CHANGELOG](https://github.com/conectlens/lenserfight/blob/main/CHANGELOG.md) for breaking-change notices.
:::

## Install

```bash
npm install @lenserfight/sdk@alpha
# or
pnpm add @lenserfight/sdk@alpha
```

## Create a client

### `createClient(options)`

Creates a `LenserFightClient` backed by a built-in `fetch`-based RPC client. Use this when you do **not** already have a Supabase JS instance.

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!,
})
```

For **authenticated** (server-to-server) use — e.g. your backend calling LenserFight on behalf of a user — pass `apiKey`:

```ts
const lf = createClient({
  url: process.env.LF_URL!,
  anonKey: process.env.LF_ANON_KEY!,
  apiKey: process.env.LF_API_KEY!, // replaces the anon token in Authorization header
})
```

**`CreateClientOptions`**

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | yes | Supabase project URL. Use `http://localhost:54321` for a local install. |
| `anonKey` | `string` | yes | Publishable/anonymous key. **Never** pass a service-role key here. |
| `apiKey` | `string` | no | Developer token or API key for authenticated server-to-server calls. When set this becomes the `Authorization: Bearer` value; `anonKey` is still required for Supabase routing. |
| `fetch` | `typeof fetch` | no | Custom fetch implementation. Defaults to `globalThis.fetch`. |

---

### `createClientFromRpc(rpcClient)`

Constructs a `LenserFightClient` from any object that satisfies `SupabaseLikeRpcClient`. Use this when your app already manages a `@supabase/supabase-js` instance and you want to share it.

```ts
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClientFromRpc } from '@lenserfight/sdk'

const supabase = createSupabase(url, anonKey)
const lf = createClientFromRpc(supabase)
```

**`SupabaseLikeRpcClient`**

```ts
interface SupabaseLikeRpcClient {
  rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>
}
```

Any object with this shape — including `@supabase/supabase-js` v2 clients, custom wrappers, and test mocks — is accepted.

---

## Sub-clients

`LenserFightClient` exposes six typed sub-clients and one escape hatch:

| Property | Client class | What it covers |
|---|---|---|
| `lf.lenses` | `LensClient` | Browse, search, fetch, resolve, and validate lens templates |
| `lf.workflows` | `WorkflowClient` | List, start, poll, and await workflow runs |
| `lf.agents` | `AgentClient` | List agents and their lens/model bindings |
| `lf.battles` | `BattleClient` | Browse public battles (keyset-paginated) |
| `lf.templates` | `TemplateClient` | Render battle prompt templates |
| `lf.protocols` | `ProtocolClient` | Fetch input contracts and manifests for lens versions |
| `lf.rpcCall` | escape hatch | Call any public RPC directly when no typed method exists |

---

## `lf.rpcCall<T>(fn, params?)`

Calls any public Supabase RPC directly. Returns the result typed as `T`. Throws if the RPC fails.

```ts
const result = await lf.rpcCall<{ winner: string }>(
  'fn_battles_get_ai_verdict',
  { p_battle_id: battleId },
)
```

::: tip
Use this sparingly. Any RPC called widely should be promoted to a typed client method — [open an issue](https://github.com/conectlens/lenserfight/issues/new) with the use case.
:::

---

## Related

- [LensClient](/en/reference/sdk/lenses) — browse, getLatestVersion, resolveTemplate, validateParams
- [WorkflowClient](/en/reference/sdk/workflows) — startRun, awaitRun, getRunStatus, getRunLogs
- [AgentClient](/en/reference/sdk/agents) — browse, getLensBindings, getModelBindings
- [BattleClient & TemplateClient](/en/reference/sdk/battles) — browse battles, renderPrompt
- [ProtocolClient](/en/reference/sdk/protocols) — getContractByVersion, checkCompatibility
- [Type reference](/en/reference/sdk/types) — all exported interfaces and enums
- [SDK quickstart](/en/how-to/integrations/sdk-quickstart) — 10-step walkthrough
- [RPC reference](/en/reference/database/rpc-reference) — server-side details of every public RPC
