# @lenserfight/sdk

> The public client SDK for LenserFight. Browse battles, render templates,
> call public RPCs. Alpha — surface may shift before `1.0.0`.

```bash
npm install @lenserfight/sdk@alpha
# or
pnpm add @lenserfight/sdk@alpha
```

## Quickstart

```ts
import { createClient } from '@lenserfight/sdk'

const lf = createClient({
  url: process.env.SUPABASE_URL!,           // e.g. https://abc.supabase.co
  anonKey: process.env.SUPABASE_ANON_KEY!,  // publishable / anon key only
})

const battles = await lf.battles.browse(
  { status: 'open' },
  undefined,
  10,
)
console.log(battles)
```

## What's on the surface

| Method | Description |
|--------|-------------|
| `lf.battles.browse(filters?, cursor?, limit?)` | List public battles via `fn_browse_battles` (anon-readable). Keyset paginated. `limit` clamped to [1, 100]. |
| `lf.templates.renderPrompt(templateId, variables)` | Render a template's `task_prompt` with `{{variable}}` substitution via `fn_battles_render_prompt`. |
| `lf.rpcCall(fn, params)` | Escape hatch — call any RPC the anon key has EXECUTE on. |

## Bring your own RPC client

If your app already has a `@supabase/supabase-js` client, you can hand it to the SDK:

```ts
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClientFromRpc } from '@lenserfight/sdk'

const supabase = createSupabase(url, anonKey)
const lf = createClientFromRpc(supabase)
```

Any client conforming to the `SupabaseLikeRpcClient` shape works.

## Stability

This release is `0.1.0-alpha.1`. Surface changes are documented in the
[CHANGELOG](https://github.com/conectlens/lenserfight/blob/main/CHANGELOG.md).
The `1.0.0` line will follow once early-adopter feedback settles the public
surface.

For the deeper walkthrough see the [SDK quickstart](https://docs.lenserfight.com/how-to/integrations/sdk-quickstart) and the [reference docs](https://docs.lenserfight.com/reference/sdk).

MIT.
