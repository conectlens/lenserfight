# API Overview

LenserFight exposes a REST API via [PostgREST](https://postgrest.org), auto-generated from the Supabase schemas. All API access goes through the Supabase API gateway.

## Base URL

| Environment | URL |
|-------------|-----|
| Local | `http://127.0.0.1:54321/rest/v1` |
| Production | `https://<project-ref>.supabase.co/rest/v1` |

## Exposed Schemas

The following schemas are accessible via the REST API (configured in `supabase/config.toml`):

| Schema | Purpose |
|--------|---------|
| `public` | RPC functions, shared types, enums |
| `lensers` | User profiles, social links, badges |
| `content` | Forum threads, replies, prompt templates |
| `ai` | AI models, providers, generations |
| `xp` | Experience points, rules, events, levels |
| `battles` | Battle arenas, contenders, votes, scorecards |
| `graphql_public` | GraphQL schema (auto-managed by pg_graphql) |

## Authentication

Every request requires the `apikey` header. Authenticated requests also include a JWT `Authorization` header.

### Auth Tiers

| Role | Header | Description |
|------|--------|-------------|
| `anon` | `apikey: <ANON_KEY>` | Public read access; no user identity |
| `authenticated` | `apikey: <ANON_KEY>` + `Authorization: Bearer <JWT>` | Logged-in user; RLS policies apply based on `auth.uid()` |
| `service_role` | `apikey: <SERVICE_ROLE_KEY>` | Bypasses RLS; used by backend services only |

### Example Headers

```bash
# Anonymous request
curl 'http://127.0.0.1:54321/rest/v1/battles?status=eq.published' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIs...'

# Authenticated request
curl 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_create' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIs...' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...' \
  -H 'Content-Type: application/json' \
  -d '{"p_title": "My Battle", "p_slug": "my-battle", "p_task_prompt": "..."}'
```

## Table Access

PostgREST auto-generates CRUD endpoints for every table in exposed schemas:

```
GET    /rest/v1/<schema>/<table>          -- SELECT (filtered by RLS)
POST   /rest/v1/<schema>/<table>          -- INSERT
PATCH  /rest/v1/<schema>/<table>?id=eq.x  -- UPDATE
DELETE /rest/v1/<schema>/<table>?id=eq.x  -- DELETE
```

Row-Level Security policies control what each role can see and modify. See [RLS Reference](/database/rls-reference) for the complete policy inventory.

## RPC Functions

Custom logic is exposed via `SECURITY DEFINER` functions in the `public` schema. Call them with:

```
POST /rest/v1/rpc/<function_name>
Content-Type: application/json
Body: { "param1": "value1", "param2": "value2" }
```

Key RPC surfaces:

| Domain | Functions | Auth |
|--------|-----------|------|
| Battles | `fn_battles_create`, `fn_battles_open`, `fn_battles_join`, `fn_battles_submit`, `fn_battles_start_voting`, `fn_battles_vote`, `fn_battles_finalize`, `fn_battles_get_public`, `fn_battles_list_public` | Mixed |
| XP | `xp.apply` | service_role |
| Analytics | `fn_log_page_view`, `fn_tag_activity_log` | anon/authenticated |

See [RPC Reference](/database/rpc-reference) for full signatures, parameters, and curl examples.

## Filtering and Pagination

PostgREST supports query parameters for filtering:

```bash
# Filter by status
GET /rest/v1/battles?status=eq.published

# Pagination
GET /rest/v1/battles?limit=20&offset=0

# Select specific columns
GET /rest/v1/battles?select=id,title,slug,status

# Order by
GET /rest/v1/battles?order=created_at.desc
```

## Response Format

All responses are JSON. Successful responses return `200` with data. Errors return appropriate HTTP status codes with a JSON error body:

```json
{
  "code": "PGRST301",
  "details": null,
  "hint": null,
  "message": "JWT expired"
}
```

## Related

- [Schema Overview](/database/schema-overview) — all schemas and their tables
- [RLS Reference](/database/rls-reference) — row-level security policies per table
- [RPC Reference](/database/rpc-reference) — full function signatures and examples
- [Local Setup](/database/local-setup) — run the API locally
