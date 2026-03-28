# Database

LenserFight uses PostgreSQL via Supabase with a multi-schema architecture. Each schema owns a bounded domain — battles, user identity, content, XP, analytics, AI, and supporting infrastructure.

The private `authz` schema stores device-approval requests and developer-token state. It is not exposed through PostgREST; clients use `public.fn_auth_*` RPC wrappers.

## Why multi-schema?

- **Isolation** — each domain has clear ownership and its own RLS policies.
- **PostgREST exposure** — only schemas listed in `config.toml` get auto-generated REST endpoints.
- **Migration safety** — changes to one schema rarely affect another.

## Schema map

| Schema | Purpose | PostgREST |
|--------|---------|-----------|
| `battles` | Core product — arenas, contenders, submissions, votes, scoring | Yes |
| `lensers` | User identity — profiles, badges, social links, waiting list | Yes |
| `content` | Forum content — threads, replies, prompt templates, tags, reactions | Yes |
| `xp` | Experience points — rules, events, totals, levels, streaks, seasons | Yes |
| `ai` | AI integration — models, generations, capabilities | Yes |
| `tenancy` | Workspace tenancy — workspaces, members, roles | Yes |
| `media` | Media/file storage — objects, attachments, upload lifecycle | Yes |
| `analytics` | Engagement tracking — stats, page views, share events, feedback | No |
| `core` | Platform primitives — features, languages, settings | No |
| `billing` | Payments — plans, entitlements, credits | No |
| `ops` | Internal operations — admin tools, moderation queues | No |
| `system` | System-level — translations, entity metadata | No |
| `public` | RPC gateway — all `fn_*` functions live here as `SECURITY DEFINER` | Yes |

## Navigation

- [Schema Overview](/reference/database/schema-overview) — table inventory and dependency diagram
- Individual schemas: [lensers](/reference/database/schema-lensers), [content](/reference/database/schema-content), [xp](/reference/database/schema-xp), [analytics](/reference/database/schema-analytics), [ai](/reference/database/schema-ai), [battles](/reference/database/schema-battles), [tenancy](/reference/database/schema-tenancy), [media](/reference/database/schema-media), [other](/reference/database/schema-other)
- [RLS Reference](/reference/database/rls-reference) — row-level security policies per table
- [RPC Reference](/reference/database/rpc-reference) — all public API functions
- [Local Setup](/reference/database/local-setup) — run the full database locally
