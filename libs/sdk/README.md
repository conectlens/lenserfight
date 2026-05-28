# @lenserfight/sdk

The official client SDK for [LenserFight](https://lenserfight.com). Browse battles, render templates, and call public RPCs — from any JavaScript runtime.

> **Alpha:** The public surface may shift before `1.0.0`. Pin to a specific alpha tag and check the [CHANGELOG](https://github.com/conectlens/lenserfight/blob/main/CHANGELOG.md) before upgrading.

```bash
npm install @lenserfight/sdk@alpha
# or
pnpm add @lenserfight/sdk@alpha
```

## Quickstart

Point the SDK at your LenserFight Supabase project. Use the project's **API URL** and **anon (publishable) key** — never a service-role key.

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.LENSERFIGHT_URL!,       // https://<ref>.supabase.co
  anonKey: process.env.LENSERFIGHT_ANON_KEY!, // publishable anon key
})

const battles = await lf.battles.browse({ status: 'open' }, undefined, 10)
console.log(battles)
```

**Cloud users:** `LENSERFIGHT_URL` and `LENSERFIGHT_ANON_KEY` come from your Supabase project's _Settings → API_ page.

**Local users:** See the [SDK quickstart](https://docs.lenserfight.com/en/how-to/integrations/sdk-quickstart) for how to spin up a local instance and capture its credentials.

## API surface

| Method | Description |
|--------|-------------|
| `lf.battles.browse(filters?, cursor?, limit?)` | List public battles via `fn_browse_battles`. Keyset-paginated. `limit` clamped to [1, 100]. |
| `lf.templates.renderPrompt(templateId, variables)` | Render a template's `task_prompt` with `{{variable}}` substitution. |
| `lf.rpcCall(fn, params)` | Call any public RPC the anon key has `EXECUTE` on. |

## Bring your own Supabase client

If your app already initialises a `@supabase/supabase-js` client, pass it directly:

```ts
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClientFromRpc } from '@lenserfight/sdk'

const supabase = createSupabase(url, anonKey)
const lf = createClientFromRpc(supabase)
```

Any object conforming to the `SupabaseLikeRpcClient` interface works. This is useful for sharing auth state, retry logic, or telemetry with the rest of your app.

## Further reading

- [SDK quickstart](https://docs.lenserfight.com/en/how-to/integrations/sdk-quickstart) — full walkthrough from install to paginated results
- [SDK reference](https://docs.lenserfight.com/en/reference/sdk/) — method-by-method API docs
- [GitHub Discussions → SDK feedback](https://github.com/conectlens/lenserfight/discussions/categories/sdk)

Apache-2.0.
