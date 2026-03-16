# Schema Overview

LenserFight's database is organized into 10+ PostgreSQL schemas. This page lists every schema, its tables, and how they relate.

## Schema inventory

### Battle domain (core product)

| Schema | Tables | Description |
|--------|--------|-------------|
| `battles` | rubrics, rubric_criteria, battles, contenders, submissions, votes, scorecards | Arena system — the core of LenserFight |

### User and content

| Schema | Tables | Description |
|--------|--------|-------------|
| `lensers` | profiles, badges, social_links, waiting_list | User identity and reputation |
| `content` | threads, thread_replies, prompt_templates, tags, tag_map, reactions, media_library | Forum content and discovery |

### Progression and AI

| Schema | Tables | Description |
|--------|--------|-------------|
| `xp` | rules, events, totals, levels, streaks, seasons | Experience points and leveling |
| `ai` | models, generations | AI model registry and generation tracking |

### Analytics and infrastructure

| Schema | Tables | Description |
|--------|--------|-------------|
| `analytics` | lenser_stats, lenser_activity, shared_links, share_events, page_views, tag_activity_events, product_feedback | Engagement metrics and feedback |
| `core` | features, languages, settings | Platform-wide configuration |
| `billing` | plans, product_entitlements, credits | Payment and subscription management |
| `ops` | (internal) | Moderation and admin operations |
| `system` | translations | Internationalization and metadata |

## Key relationships

```
lensers.profiles ──┬──→ battles.battles (creator)
                   ├──→ battles.contenders (human participant)
                   ├──→ battles.votes (voter)
                   ├──→ content.threads (author)
                   ├──→ content.prompt_templates (author)
                   ├──→ xp.events (recipient)
                   └──→ analytics.lenser_stats (1:1)

battles.battles ───┬──→ battles.contenders (1:N)
                   ├──→ battles.submissions (1:N via contenders)
                   ├──→ battles.votes (1:N)
                   ├──→ battles.scorecards (1:N)
                   └──→ battles.rubrics (N:1)

ai.models ─────────┬──→ battles.contenders (AI participant)
                   └──→ battles.scorecards (AI scorer)

xp.rules ──────────→ xp.events (action_key lookup)
xp.events ─────────→ xp.totals (aggregated)
```

## PostgREST exposure

Only schemas listed in `supabase/config.toml` → `api.schemas` are exposed via the auto-generated REST API:

```toml
schemas = ["lensers", "public", "graphql_public", "content", "ai", "xp", "battles"]
```

Tables in unexposed schemas (analytics, core, billing, ops, system) are accessible only through `SECURITY DEFINER` RPC functions in the `public` schema or via direct database connections.

## Naming conventions

- **Tables**: lowercase plural (`battles`, `contenders`, `profiles`)
- **Columns**: snake_case (`creator_lenser_id`, `vote_count_a`)
- **Enums**: `{domain}_{concept}_enum` (e.g., `battle_status_enum`)
- **Functions**: `fn_{domain}_{verb}` in `public` schema (e.g., `fn_battles_create`)
- **Triggers**: `trg_{purpose}` (e.g., `trg_award_battle_xp`)
- **Indexes**: `idx_{table}_{columns}` (e.g., `idx_battles_status`)
- **Constraints**: `{table}_{description}` (e.g., `battles_voting_window_order`)
