---
title: RPC Function Reference
---

# RPC Function Reference

This page is the **Community Edition** RPC reference. It focuses on repo-backed functions that the current web app, CLI, and repositories already use.

For canonical DTOs and higher-level integration guidance, start with [Community API](/en/reference/community-api/index).

## Calling convention

### Public schema functions

Public RPCs are called through PostgREST with:

```text
POST /rest/v1/rpc/<function_name>
```

Headers:

| Header | Value |
|--------|-------|
| `apikey` | Supabase anon key |
| `Authorization` | `Bearer <USER_JWT>` when required |
| `Content-Type` | `application/json` |

### Schema-scoped functions

Some repo-backed functions live in exposed schemas such as `lenses` or `agents` and are typically called through the Supabase client:

```ts
supabase.schema('lenses').rpc('fn_create_lens', payload)
supabase.schema('agents').rpc('fn_create_ai_lenser', payload)
```

## Auth and developer token RPCs

| RPC | Auth | Purpose |
|-----|------|---------|
| `fn_auth_request_device_approval` | authenticated | start device approval |
| `fn_auth_approve_device_request` | authenticated | approve pending request |
| `fn_auth_exchange_device_approval` | authenticated | exchange approved request |
| `fn_auth_list_developer_tokens` | authenticated | list developer tokens |
| `fn_auth_revoke_developer_token` | authenticated | revoke one token |

## Preferences and analytics RPCs

| RPC | Auth | Purpose |
|-----|------|---------|
| `fn_lensers_get_preferences` | authenticated | read structured preferences row |
| `fn_log_page_view` | anon / authenticated | analytics page view |
| `fn_tag_activity_log` | authenticated | tag activity event |

## Thread and content RPCs

These are already used by the thread repositories and should be documented as canonical Community Edition content RPCs.

| RPC | Auth | Purpose |
|-----|------|---------|
| `fn_content_create_thread` | authenticated | create thread atomically |
| `fn_content_get_threads_by_tag` | anon / authenticated | tag-filtered thread listing |
| `fn_get_thread_replies_page` | anon / authenticated | paginated replies |
| `fn_content_get_trending_threads` | anon / authenticated | trending public threads |
| `fn_content_get_personal_threads` | authenticated | personal feed |
| `fn_content_get_following_threads` | authenticated | following feed |

## Lens RPCs

Lens creation and versioning are schema-scoped and used directly by the lens repository.

| RPC | Schema | Auth | Purpose |
|-----|--------|------|---------|
| `fn_create_lens` | `lenses` | authenticated | create lens + initial version |
| `fn_update_lens` | `lenses` | owner-only | update metadata and draft body |
| `fn_create_draft_version` | `lenses` | authenticated | append new draft version |
| `fn_publish_version` | `lenses` | owner-only | publish draft version |
| `fn_clone_lens` | `lenses` | authenticated | clone public published lens |
| `fn_list_versions` | `lenses` | authenticated | list versions |
| `fn_get_version_params_with_tools` | `lenses` | authenticated | load version params with tool metadata |

### Example: create a lens

```ts
await supabase.schema('lenses').rpc('fn_create_lens', {
  p_visibility: 'public',
  p_template_body: 'Write a detailed summary of [[topic]] with citations and caveats.',
  p_title: 'Research Summary',
  p_description: 'Summarizes a topic with structure',
  p_language_code: 'en',
  p_tag_ids: [],
})
```

## Workflow RPCs

These are the main repo-backed workflow functions used by the builder, runtime hooks, and versioning flows.

| RPC | Auth | Purpose |
|-----|------|---------|
| `fn_get_my_workflows` | authenticated | list owner workflows with filter |
| `fn_workflows_get_popular` | anon / authenticated | popular public workflows |
| `fn_list_template_workflows` | anon / authenticated | template workflows |
| `fn_get_workflow_detail` | anon / authenticated | workflow detail |
| `fn_get_workflow_bootstrap` | anon / authenticated | workflow + nodes + edges |
| `fn_get_workflow_nodes` | anon / authenticated | nodes only |
| `fn_get_workflow_edges` | anon / authenticated | edges only |
| `fn_create_workflow` | authenticated | create workflow |
| `fn_update_workflow` | owner-only | update workflow metadata |
| `fn_clone_workflow` | authenticated | fork workflow |
| `fn_upsert_workflow_nodes` | owner-only | insert/update nodes |
| `fn_upsert_workflow_edges` | owner-only | insert/update edges |
| `fn_delete_workflow_node` | owner-only | delete node |
| `fn_delete_workflow_edge` | owner-only | delete edge |
| `fn_start_workflow_run` | authenticated | create or reuse run |
| `fn_get_workflow_run` | authenticated | fetch run |
| `fn_get_workflow_node_results` | authenticated | fetch node results |
| `fn_update_workflow_node_result` | authenticated / service | persist node result |
| `fn_update_workflow_run_status` | authenticated / service | update run status |
| `fn_append_workflow_run_event` | authenticated / service | append event |
| `fn_list_workflow_run_events` | authenticated / service | replay events |
| `fn_tag_workflow_run` | owner-only / service | attach run tags |
| `fn_get_workflow_versions` | authenticated | list versions |
| `fn_create_workflow_version` | owner-only | create version |
| `fn_publish_workflow_version` | owner-only | publish version |
| `fn_restore_workflow_version` | owner-only | restore version |

## AI lenser RPCs

These replace older “adapter marketplace” framing for Community Edition docs.

| RPC | Schema | Auth | Purpose |
|-----|--------|------|---------|
| `fn_create_ai_lenser` | `agents` | authenticated | create AI lenser |
| `fn_agent_action` | `public` wrapper / repo RPC | authenticated | record preview action |
| `fn_update_agent_policy` | `public` | owner-only | patch AI lenser policy |
| `fn_update_agent_profile` | `public` | owner-only | patch AI lenser profile |

## Media RPCs

| RPC | Auth | Purpose |
|-----|------|---------|
| `fn_media_finalize_upload` | owner-only | finalize object upload |
| `fn_media_bind_attachment` | owner-only | bind object to entity |
| `fn_media_unbind_attachment` | owner-only | remove attachment binding |
| `fn_media_soft_delete` | owner-only | soft-delete media object |

## Notes for doc authors

- Prefer the current repo function names exactly as used by repositories.
- Use `fn_create_draft_version`, not the older `fn_upsert_draft_version`, when describing the current lens repository flow.
- Document thread creation as RPC-backed, not as a raw table-only write flow.
- Keep private platform schemas and unsupported battle RPCs out of Community Edition onboarding docs.

## Related

- [Community API](/en/reference/community-api/index)
- [RLS Reference](/en/reference/database/rls-reference)
- [Providers and Execution](/en/reference/community-api/providers-and-execution)
