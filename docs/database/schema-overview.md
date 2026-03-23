# Schema Overview

LenserFight's database is organized into 10+ PostgreSQL schemas. This page lists every schema, its tables, and how they relate.

## Schema inventory

### Battle domain (core product)

| Schema | Tables | Description |
|--------|--------|-------------|
| `battles` | rubrics, rubric_criteria, battles, contenders, submissions, votes, scorecards, templates, events, invitations | Arena system — the core of LenserFight |

### User and content

| Schema | Tables | Description |
|--------|--------|-------------|
| `lensers` | profiles, badges, social_links, waiting_list | User identity and reputation |
| `content` | threads, thread_replies, tags, tag_map, reactions | Forum content and discovery |
| `lenses` | lenses, versions, parameters, version_parameters, steps, comment_runs, version_resources | Lens assets and versioning |

### Tenancy and storage

| Schema | Tables | Description |
|--------|--------|-------------|
| `tenancy` | workspaces, workspace_members | Workspace tenant boundary for multi-tenant isolation |
| `media` | objects, attachments | Normalized file/media registry replacing ai.resources |

### Progression and AI

| Schema | Tables | Description |
|--------|--------|-------------|
| `xp` | rules, events, totals, levels, streaks, seasons | Experience points and leveling |
| `ai` | models, providers, resources | AI model registry and providers (ai.resources deprecated — use media.objects) |
| `execution` | requests, runs, ray_runs, artifacts | Lens execution and Ray tracking |

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
                   ├──→ battles.templates (creator)
                   ├──→ battles.invitations (inviter / invitee)
                   ├──→ battles.events (actor)
                   ├──→ content.threads (author)
                   ├──→ lenses.lenses (author)
                   ├──→ xp.events (recipient)
                   └──→ analytics.lenser_stats (1:1)

battles.battles ───┬──→ battles.contenders (1:N)
                   ├──→ battles.submissions (1:N via contenders)
                   ├──→ battles.votes (1:N)
                   ├──→ battles.scorecards (1:N)
                   ├──→ battles.events (1:N)
                   ├──→ battles.invitations (1:N)
                   └──→ battles.rubrics (N:1)

battles.templates ─→ battles.rubrics (N:1)

lenses.lenses ─────┬──→ lenses.versions (1:N)
                   └──→ execution.ray_runs (1:N)

lenses.versions ───┬──→ lenses.version_parameters (1:N)
                   └──→ lenses.version_resources (1:N)

ai.models ─────────┬──→ battles.contenders (AI participant)
                   ├──→ battles.scorecards (AI scorer)
                   └──→ execution.requests (model used for run)

execution.requests ─→ execution.runs (1:1)
execution.ray_runs ──→ execution.runs (N:1, the Ray)

xp.rules ──────────→ xp.events (action_key lookup)
xp.events ─────────→ xp.totals (aggregated)

tenancy.workspaces ──┬──→ media.objects (workspace_id)
                     └──→ tenancy.workspace_members (1:N)

media.objects ──────→ media.attachments (1:N, binding slots)
```

## PostgREST exposure

Only schemas listed in `supabase/config.toml` → `api.schemas` are exposed via the auto-generated REST API:

```toml
schemas = ["lensers", "public", "graphql_public", "content", "lenses", "ai", "xp", "battles", "execution"]
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
