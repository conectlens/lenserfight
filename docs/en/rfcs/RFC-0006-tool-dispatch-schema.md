---
title: "RFC-0006: Tool Registry Endpoint & Credential Schema"
description: Schema and auth-mapping design for making agents.tools_registry entries actually dispatchable to external HTTP APIs.
---

# RFC-0006: Tool Registry Endpoint & Credential Schema

| | |
|---|---|
| **Status** | Draft |
| **Author** | LenserFight Core |
| **Phase** | Agents — Tool dispatch |
| **Created** | 2026-08-06 |
| **Supersedes** | — |
| **Superseded by** | — |

## Summary

`agents.tools_registry` lets an owner register a tool (`fn_register_tool`) and assign it to an agent (`fn_assign_tool`), and `fn_invoke_tool` already implements the approval-gating decision (`egress_class = 'write'` or `requires_approval` forces `approval_status = 'pending'`) and writes a row to `agents.tool_invocations`. What's missing is the data a dispatcher would need to actually call the tool: there is no endpoint, no HTTP method, no request shape, and no credential reference anywhere in the schema. This RFC adds exactly those fields to `agents.tools_registry`, plus the auth-mapping convention a future dispatcher (tracked separately) must follow. It does not implement the dispatcher itself, and it does not decide how credentials are stored at rest — that is [issue #461](https://github.com/conectlens/lenserfight/issues/461).

## Motivation

Milestone: [Generic Tool Invocation Dispatcher for Agents](https://github.com/conectlens/lenserfight/milestone/1). Today `fn_invoke_tool` moves a non-approval-gated invocation straight to `status = 'running'` and nothing ever transitions it further — there is no code path anywhere in the platform that performs an outbound HTTP call on behalf of a registered tool. A tool registered today is metadata only. Before a dispatcher can be built (a later issue in this milestone), the registry needs to be able to describe *where* and *how* to call a tool, and *how* to attach credentials without ever storing a raw secret in `agents.tools_registry` itself.

## Detailed design

### Schema diff — `agents.tools_registry`

```sql
ALTER TABLE "agents"."tools_registry"
  ADD COLUMN "endpoint_url" "text",
  ADD COLUMN "http_method" "text" DEFAULT 'POST'::"text" NOT NULL,
  ADD COLUMN "request_template" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
  ADD COLUMN "auth_placement" "text" DEFAULT 'header'::"text" NOT NULL,
  ADD COLUMN "auth_param_name" "text" DEFAULT 'Authorization'::"text" NOT NULL,
  ADD COLUMN "credential_ref" "uuid",
  ADD CONSTRAINT "tools_registry_http_method_check"
    CHECK (("http_method" = ANY (ARRAY['GET'::"text", 'POST'::"text", 'PUT'::"text", 'PATCH'::"text", 'DELETE'::"text"]))),
  ADD CONSTRAINT "tools_registry_auth_placement_check"
    CHECK (("auth_placement" = ANY (ARRAY['header'::"text", 'query'::"text"]))),
  ADD CONSTRAINT "tools_registry_endpoint_required_unless_none_check"
    CHECK (("egress_class" = 'none'::"text") OR ("endpoint_url" IS NOT NULL));
```

| Column | Type | Purpose |
|---|---|---|
| `endpoint_url` | `text`, nullable | Absolute URL the dispatcher calls. Nullable only for `egress_class = 'none'` (compute-only) tools. |
| `http_method` | `text`, default `POST` | One of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. |
| `request_template` | `jsonb`, default `{}` | Static request shape (headers/body skeleton) the dispatcher merges the invocation's `tool_invocations.input` into. Interpolation rules are a dispatcher-issue concern, not this RFC. |
| `auth_placement` | `text`, default `header` | Where the resolved credential goes: `header` or `query`. |
| `auth_param_name` | `text`, default `Authorization` | The header or query-param name the credential is written to (e.g. Postiz's public API reads the raw key from the `Authorization` header — see `apps/backend/src/services/auth/public.auth.middleware.ts` in the `postiz-app` repo). |
| `credential_ref` | `uuid`, nullable | Opaque pointer into whatever store issue #461 lands (e.g. Supabase Vault secret id). **Never** a raw secret value. Required whenever `auth_method <> 'none'`; enforcing that is left to issue #461 once the credential store exists, since the constraint depends on a table this RFC does not define. |

No changes to `agents.tool_assignments` or `agents.tool_invocations` — both already carry what the dispatcher needs on the execution side (`tool_invocations.input`, `.output`, `.status`, `.approval_status`).

### `auth_method` → dispatch mapping

`auth_method` already exists and is enforced by `tools_registry_auth_method_check` (`none | api_key | oauth | service_account`). This table fixes what each value means for a dispatcher:

| `auth_method` | Dispatcher behavior |
|---|---|
| `none` | No credential resolution. `credential_ref` must be `NULL`. |
| `api_key` | Resolve `credential_ref` to a static secret string; write it to `auth_placement`/`auth_param_name` verbatim (no prefix added — if a scheme prefix like `Bearer ` is required, it belongs in the stored secret or a future `auth_param_prefix` column, out of scope here). |
| `oauth` | Resolve `credential_ref` to a token record with expiry; dispatcher refreshes before use if expired. Refresh mechanics are out of scope for this RFC — deferred to whichever issue implements `oauth` support (not required for the Postiz validation target, which uses `api_key`). |
| `service_account` | Resolve `credential_ref` to a service-account handle; resolution mechanics out of scope, no consumer in this milestone. |

### Worked example (Postiz, the milestone's validation target)

```sql
SELECT fn_register_tool(
  p_key             => 'postiz.create_post',
  p_name            => 'Postiz: Create Post',
  p_description     => 'Create/schedule a post on a connected social channel via Postiz.',
  p_category        => 'social',
  p_schema_input    => '{"type":"object","required":["integrationId","content"],"properties":{"integrationId":{"type":"string"},"content":{"type":"string"}}}'::jsonb,
  p_schema_output   => '{"type":"object","properties":{"postId":{"type":"string"}}}'::jsonb,
  p_auth_method     => 'api_key',
  p_requires_approval => true,
  p_is_dangerous    => false
);
-- then, once the columns in this RFC exist:
UPDATE agents.tools_registry
   SET endpoint_url      = 'http://<postiz-host>/api/public/v1/posts',
       http_method        = 'POST',
       auth_placement     = 'header',
       auth_param_name    = 'Authorization',
       egress_class       = 'write',
       credential_ref     = :postiz_api_key_secret_id  -- from issue #461
 WHERE key = 'postiz.create_post';
```

`egress_class = 'write'` already auto-forces `requires_approval` at invocation time per the existing `fn_invoke_tool` logic — the explicit `p_requires_approval => true` above is redundant but kept for clarity.

**Validated in #464 (self-hosted Postiz via docker-compose):** the endpoint must go through Postiz's `/api/` nginx prefix (its docker-compose deployment fronts the backend with nginx; hitting `/public/v1/posts` directly falls through to the frontend and returns HTML, not JSON) — hence `/api/public/v1/posts` above, not the bare backend path. Also note Postiz API keys are per-organization: a key from the wrong org doesn't fail auth, it 400s as if the integration doesn't exist. And X posts require a `settings.who_can_reply_post` value in `request_template.body` even for `type: 'draft'`, so a real Postiz `request_template` needs that field set — see PR #472 for the exact worked payload.

## Drawbacks

- Adds five columns and three constraints to a table with existing rows; low risk (all new columns are nullable or have defaults) but still a schema change to a production-linked project and needs the standard migration review (RLS, `supabase-schema-reviewer`) even though no RLS policy changes.
- `request_template` as free-form `jsonb` defers real interpolation-safety questions (e.g. preventing an agent from injecting into `endpoint_url` via input) to the dispatcher issue. This RFC does not itself prevent SSRF-style abuse — it only carries the URL.
- `credential_ref` pointing at "whatever issue #461 lands" is a forward reference; if #461 lands a design that can't be addressed by a single `uuid`, this RFC needs a follow-up migration.

## Alternatives considered

- **Store endpoint/auth config in `request_template` jsonb instead of typed columns.** Rejected: makes the `write` vs `read_only` egress gate and the http-method allow-list unenforceable at the database level, pushing correctness entirely into application code.
- **Skip `auth_placement`/`auth_param_name` and hardcode `Authorization` header everywhere.** Rejected: not every service reads a bearer-style token from `Authorization` (some use `X-Api-Key`, some use a query string); a generic dispatcher milestone should not special-case services in code, per the platform's existing "no service-specific branching in core code" convention (see `postiz-app`'s equivalent provider-interface rule for the same reason).
- **Add `credential_ref` as a foreign key now.** Rejected: the credential store doesn't exist yet (issue #461); a bare `uuid` with a code comment is honest about the dependency instead of inventing a placeholder table that would need to be redesigned anyway.

## Unresolved questions

- Does `request_template` need a documented interpolation mini-language (e.g. `&#123;&#123;input.foo&#125;&#125;`) before the dispatcher issue starts, or can that be decided inside that issue? Leaning toward: decide in the dispatcher issue, since it's an execution-time concern, not a storage concern.
- Should `auth_param_name` support a value *prefix* (e.g. `Bearer `) as a separate column, or is that expected to live inside the stored secret itself? Left open; doesn't block the migration in issue #460 since it's an additive column either way.

## Implementation notes

- Migration: issue #460, additive-only (no backfill required — existing rows get the column defaults; `egress_class = 'none'` rows never trip the new `endpoint_url` constraint).
- Rollback: dropping the five columns and three constraints is safe and reversible as long as no dispatcher code has shipped yet that depends on them.
- Affected files (repo: `conectlens/lenserfight`): `supabase/migrations/` (new migration), `supabase/schema.sql` (regenerated), `fn_register_tool` (optionally extended with new optional params in the same migration or a follow-up — not required for this RFC to be actionable).
- Downstream: issue #461 (secrets store `credential_ref` points into), issue #462 (dispatcher consuming these columns), issue #464 (Postiz registered using this exact shape).
