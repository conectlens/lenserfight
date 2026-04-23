# Schema Overview

LenserFight Community Edition uses multiple PostgreSQL schemas, but OSS beta docs should emphasize the schemas external developers actually interact with in this repo.

## Community Edition schema inventory

| Schema | Tables | Description |
|--------|--------|-------------|
| `lensers` | profiles, badges, social_links, waiting_list | User identity and reputation |
| `content` | threads, thread_replies, tags, tag_map, reactions | Forum content and discovery |
| `lenses` | lenses, versions, version_parameters, workflows, workflow_nodes, workflow_edges, workflow_runs | Lens assets and orchestration |
| `tenancy` | workspaces, workspace_members | Workspace tenant boundary for multi-tenant isolation |
| `media` | objects, attachments | Normalized file/media registry replacing ai.resources |
| `ai` | models, providers, keys, generations | AI model registry and execution-adjacent metadata |
| `execution` | requests, runs, artifacts, request_attachments | Execution history and artifact persistence |
| `public` | RPC functions | Public RPC entrypoints used by the repo |

## Key relationships

```
lensers.profiles ──┬──→ content.threads (author)
                   ├──→ lenses.lenses (author)
                   └──→ media.objects (owner)

lenses.lenses ─────┬──→ lenses.versions (1:N)
                   └──→ lenses.workflow_nodes (via lens_id)

lenses.versions ───┬──→ lenses.version_parameters (1:N)
                   └──→ lenses.workflow_nodes (version pin)

lenses.workflows ──┬──→ lenses.workflow_nodes (1:N)
                   ├──→ lenses.workflow_edges (1:N)
                   └──→ lenses.workflow_runs (1:N)

lenses.workflow_runs ──┬──→ lenses.workflow_node_results (1:N)
                       └──→ lenses.workflow_run_events (1:N)

ai.models ─────────→ execution.requests (model used for run)
execution.requests ─→ execution.runs (1:1)

tenancy.workspaces ──┬──→ media.objects (workspace_id)
                     └──→ tenancy.workspace_members (1:N)

media.objects ──────→ media.attachments (1:N, binding slots)
```

## PostgREST exposure

Only schemas listed in `supabase/config.toml` → `api.schemas` are exposed via the auto-generated REST API:

```toml
schemas = ["lensers", "public", "graphql_public", "content", "lenses", "ai", "xp", "execution"]
```

The OSS docs should treat `lenses`, `lensers`, `content`, `ai`, `execution`, and `public` as the main API-facing schemas.

## Private or secondary schemas

Other schemas may exist in migrations or private platform flows, but they are not the primary Community Edition contract for external developers.

## Naming conventions

- **Tables**: lowercase plural (`lenses`, `versions`, `profiles`)
- **Columns**: snake_case (`creator_lenser_id`, `vote_count_a`)
- **Enums**: `{domain}_{concept}_enum` (e.g., `lens_status_enum`)
- **Functions**: `fn_{domain}_{verb}` in `public` schema (e.g., `fn_lenses_create`)
- **Triggers**: `trg_{purpose}` (e.g., `trg_award_xp`)
- **Indexes**: `idx_{table}_{columns}` (e.g., `idx_lenses_status`)
- **Constraints**: `{table}_{description}` (e.g., `lenses_version_order`)
