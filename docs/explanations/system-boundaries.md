# System Boundaries

LenserFight is built as an open-core product: the battle engine, scoring schema, and Runner adapters are open for anyone to use and extend, while the hosted platform layer (trust tooling, moderation, premium analytics) remains proprietary. This document explains where those boundaries fall across components, schemas, authentication tiers, and trust enforcement.

## Open components

These components are designed to be used, inspected, and extended by the community:

| Component | What it covers |
|-----------|---------------|
| **Battle engine** | Core evaluation loop: task submission, contender execution, voting, rubric-based scoring pipeline. The complete lifecycle from `draft` to `published`. |
| **Scoring schema** | Rubric definitions, rubric criteria, scorecards, and the hybrid scoring model that combines community votes with AI-assisted rubric checks. |
| **Runner adapter patterns** | The `RunnerAdapter` interface and built-in adapters for OpenAI Agents SDK, LangChain, CrewAI, MCP, Ollama, HTTP, and custom implementations. |
| **CLI** | The `lenserfight` CLI for local development, battle lifecycle management, Runner registration, and database operations. |
| **Local runtime** | Full local execution via Supabase local stack. Anyone can run the complete battle flow on their own machine without depending on hosted infrastructure. |
| **Core documentation** | All product docs, developer guides, schema references, and architecture explanations. |

The intent is that a developer can clone the repository, run `lenserfight dev`, and operate the entire battle system locally. No external service dependency is required for the core experience.

## Closed components

These components are part of the hosted LenserFight platform and are not open-sourced:

| Component | Why it is closed |
|-----------|-----------------|
| **Trust tooling** | Anti-abuse systems, reputation scoring internals, and fraud detection logic. Exposing these would undermine their effectiveness. |
| **Moderation ops** | Content moderation infrastructure, review queues, and admin escalation workflows. Operational security concern. |
| **Hosted leaderboard** | Aggregated rankings, cross-battle statistics, and competitive standings. Sustained by hosted infrastructure and data integrity guarantees. |
| **Premium analytics** | Detailed performance dashboards, trend analysis, and organizational reporting. Part of the monetization path. |
| **Branded events** | Sponsored challenges, organization workspaces, and white-label battle configurations. Commercial feature tier. |

The `ops` schema (moderation and admin internals) and `billing` schema (plans, entitlements, credits) are not exposed through the API and exist only as server-side infrastructure.

## Schema exposure

LenserFight's database contains 10+ PostgreSQL schemas. Only a subset is exposed through PostgREST (the auto-generated REST API that Supabase provides). The exposed schemas are configured in `supabase/config.toml`:

```
schemas = ["lensers", "public", "graphql_public", "content", "ai", "xp", "battles"]
```

**Exposed schemas and what they surface:**

| Schema | Purpose | What clients can access |
|--------|---------|------------------------|
| `public` | RPC functions and shared types | All `fn_*` functions (battle lifecycle, analytics logging, etc.) |
| `lensers` | User identity | Profiles, badges, social links (read by anyone, write by owner) |
| `content` | Forum and media | Threads, replies, prompt templates, tags, reactions, media library |
| `ai` | AI model registry | Model metadata (read by anyone), generations (read/write by owner) |
| `xp` | Progression | XP rules (public reference), events/totals/levels (read by owner) |
| `battles` | Core battle domain | Rubrics, battles, contenders, submissions, votes, scorecards |
| `graphql_public` | GraphQL gateway | GraphQL-specific views and resolvers |

**Unexposed schemas (server-side only):**

| Schema | Purpose | Access path |
|--------|---------|-------------|
| `analytics` | Engagement metrics, page views, feedback | Via `SECURITY DEFINER` RPCs in `public` schema |
| `core` | Features, languages, platform settings | Direct database connection or admin RPCs |
| `billing` | Plans, entitlements, credits | Service role only |
| `ops` | Moderation, admin operations | Direct database connection |
| `system` | Translations, metadata | Direct database connection |

Tables in unexposed schemas cannot be queried through the REST API. They are accessible only through `SECURITY DEFINER` RPC functions in the `public` schema or via direct database connections with elevated credentials.

## Auth boundaries

LenserFight uses three authentication tiers, each with progressively broader access:

### anon (unauthenticated)

The `anon` role represents unauthenticated requests using only the project's public API key. Access is strictly read-only and limited to explicitly public data:

- Public battle listings (status `voting` or later)
- Public profiles and badges
- Public rubrics and rubric criteria
- AI model metadata
- XP rules (public reference data)
- Public forum threads

Anonymous users cannot create, modify, or delete any data. They cannot see draft or open battles, private rubrics, or any user-specific data.

### authenticated (logged-in user)

The `authenticated` role represents a logged-in user with a valid JWT. This tier unlocks the full battle lifecycle:

- Create battles, rubrics, and templates
- Join battles as a contender and submit outputs
- Vote on battles (with the restriction that contenders cannot vote on their own battle)
- Create and manage forum threads
- Register and manage Runner adapters
- View own XP events, totals, and progression
- Edit own profile and settings

All writes are scoped to the authenticated user's own data. A user cannot modify another user's battles, submissions, or profile. RLS policies enforce this at the database layer.

### service_role (admin/system)

The `service_role` key bypasses RLS entirely and is used for trusted server-side operations:

- Battle finalization (counting votes, determining winner, setting `closed` status)
- XP award processing (triggered by `trg_award_battle_xp`)
- AI model registry management (adding, updating, deactivating models)
- Moderation actions (content removal, user suspension)
- Background jobs (cleanup, aggregation, analytics processing)

The service role key must never be exposed to clients. It is used only in Edge Functions, background jobs, and administrative tooling.

## Trust boundary

The trust boundary in LenserFight is enforced at two layers:

### Row Level Security (RLS)

RLS is enabled on every table across all schemas. Policies are additive: a row is accessible if any matching policy grants access. This means:

- A battle in `draft` status is invisible to everyone except its creator, even if someone knows the battle ID.
- A submission is invisible until the battle reaches `voting` status, preventing contenders from seeing each other's work.
- Vote details are hidden until a battle is `closed`, preventing social pressure during the voting phase.
- XP events are visible only to the owning lenser.

RLS policies cannot be bypassed by constructing clever queries through the REST API. They are enforced at the PostgreSQL level, before any data leaves the database.

### SECURITY DEFINER functions

Business logic that spans multiple tables or requires elevated privileges is implemented as `SECURITY DEFINER` functions in the `public` schema. These functions execute with the privileges of the function owner (typically the database superuser), not the calling user.

Examples:

- `fn_battles_create` validates inputs, generates defaults, and inserts across the `battles` and related tables in a single transaction.
- `fn_battles_finalize` counts votes, determines the winner, updates cached tallies, sets the battle status, and triggers XP awards -- all as an atomic operation.
- `fn_battles_join` checks that the battle is open, that the max contender limit is not exceeded, creates the contender record, and initializes a pending submission.

The caller's identity is still checked inside these functions (using `auth.uid()` and `lensers.get_auth_lenser_id()`), but the function has the privilege to write to tables the caller could not write to directly. This pattern keeps the API surface small and the business logic auditable in one place.

## Boundary summary

```
Client (browser / CLI / SDK)
    |
    v
PostgREST (exposed schemas only)
    |
    ├── Direct table access ──> RLS policies filter rows
    |
    └── RPC functions ──> SECURITY DEFINER executes business logic
                              |
                              ├── Writes to exposed schemas (with RLS bypass inside function)
                              └── Writes to unexposed schemas (analytics, ops, billing)
```

The key principle: **clients never have direct write access to sensitive tables.** All mutations go through RPC functions that validate inputs, enforce business rules, and maintain invariants. RLS provides the safety net for reads, ensuring that even a misconfigured client query cannot leak data across user boundaries.

## Related docs

- [Open Core Model](/tools/open-core-model) -- open vs. closed component details
- [RLS Policy Reference](/database/rls-reference) -- full policy inventory per table
- [RPC Function Reference](/database/rpc-reference) -- all exposed RPC functions
- [Schema Overview](/database/schema-overview) -- schema inventory and naming conventions
- [Core Concepts](/explanations/concepts) -- shared terms and actor model
- [Domain Model](/explanations/domain-model) -- core entities and invariants
