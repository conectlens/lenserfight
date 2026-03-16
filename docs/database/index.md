# Database

LenserFight uses PostgreSQL via Supabase with a multi-schema architecture. Each schema owns a bounded domain — battles, user identity, content, XP, analytics, AI, and supporting infrastructure.

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
| `analytics` | Engagement tracking — stats, page views, share events, feedback | No |
| `core` | Platform primitives — features, languages, settings | No |
| `billing` | Payments — plans, entitlements, credits | No |
| `ops` | Internal operations — admin tools, moderation queues | No |
| `system` | System-level — translations, entity metadata | No |
| `public` | RPC gateway — all `fn_*` functions live here as `SECURITY DEFINER` | Yes |

## Navigation

- [Schema Overview](/database/schema-overview) — table inventory and dependency diagram
- Individual schemas: [lensers](/database/schema-lensers), [content](/database/schema-content), [xp](/database/schema-xp), [analytics](/database/schema-analytics), [ai](/database/schema-ai), [battles](/database/schema-battles), [other](/database/schema-other)
- [RLS Reference](/database/rls-reference) — row-level security policies per table
- [RPC Reference](/database/rpc-reference) — all public API functions
- [Local Setup](/database/local-setup) — run the full database locally
