---
title: RPC Function Reference
---

# RPC Function Reference

## Overview

All RPC functions are defined in the `public` schema and exposed via PostgREST. They use `SECURITY DEFINER` to execute with the privileges of the function owner, allowing controlled access to operations that span multiple tables or enforce complex business rules.

## Calling Convention

All RPCs are invoked via HTTP POST:

```
POST /rest/v1/rpc/<function_name>
```

Required headers:

| Header | Value |
|--------|-------|
| `apikey` | Project anon key (always required) |
| `Authorization` | `Bearer <USER_JWT>` (for authenticated/service_role calls) |
| `Content-Type` | `application/json` |

Parameters are passed as a JSON object in the request body.

---

## Battle RPCs

### `fn_battles_create`

Create a new battle in draft status.

| Property | Value |
|----------|-------|
| **Auth** | authenticated |
| **Parameters** | `p_title` text, `p_slug` text, `p_task_prompt` text, `p_rubric_id` uuid (optional) |
| **Returns** | uuid (new battle ID) |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_create' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_title": "My Battle",
    "p_slug": "my-battle",
    "p_task_prompt": "Write a short story about a robot learning to paint."
  }'
```

---

### `fn_battles_open`

Transition a battle from `draft` to `open`. Automatically generates an invite code.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (battle owner) |
| **Parameters** | `p_battle_id` uuid |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_open' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

### `fn_battles_join`

Join a battle as a human contender. Automatically creates a pending submission record.

| Property | Value |
|----------|-------|
| **Auth** | authenticated |
| **Parameters** | `p_battle_id` uuid |
| **Returns** | uuid (new contender ID) |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_join' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

### `fn_battles_submit`

Submit content for a battle. The caller must be a contender in the battle.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (contender) |
| **Parameters** | `p_battle_id` uuid, `p_content_text` text (optional), `p_content_url` text (optional), `p_content_media` jsonb (optional) |
| **Returns** | uuid (submission ID) |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_submit' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_content_text": "Once upon a time, a robot picked up a brush..."
  }'
```

---

### `fn_battles_start_voting`

Transition a battle from `open` to `voting`. Requires all contender submissions to be complete.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (battle owner) |
| **Parameters** | `p_battle_id` uuid, `p_voting_closes_at` timestamptz (optional) |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_start_voting' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_voting_closes_at": "2026-04-01T00:00:00Z"
  }'
```

---

### `fn_battles_vote`

Cast or change a vote on a battle. Uses a delete-then-insert pattern internally; votes are immutable at the row level.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (non-contender) |
| **Parameters** | `p_battle_id` uuid, `p_vote` vote_value_enum, `p_rationale` text (optional) |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_vote' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_vote": "contender_a",
    "p_rationale": "More creative use of color."
  }'
```

---

### `fn_battles_finalize`

Finalize a battle: count votes, determine the winner, set status to `closed`, and trigger XP awards.

| Property | Value |
|----------|-------|
| **Auth** | service_role |
| **Parameters** | `p_battle_id` uuid |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_finalize' \
  -H 'apikey: <SERVICE_ROLE_KEY>' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

### `fn_battles_get_public`

Get a single battle with its contenders, submissions, votes, and scorecards.

| Property | Value |
|----------|-------|
| **Auth** | anon / authenticated |
| **Parameters** | `p_battle_id` uuid |
| **Returns** | jsonb |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_get_public' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

### `fn_battles_list_public`

Paginated listing of public battles (status `voting` or later).

| Property | Value |
|----------|-------|
| **Auth** | anon / authenticated |
| **Parameters** | `p_limit` int (default 20), `p_offset` int (default 0) |
| **Returns** | jsonb |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_list_public' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"p_limit": 10, "p_offset": 0}'
```

---

### `fn_battles_publish`

Transition a battle from `closed` to `published`. Makes the battle and its full results publicly showcased.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (battle creator) |
| **Parameters** | `p_battle_id` uuid |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_publish' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

### `fn_battles_archive`

Transition a battle from `closed` or `published` to `archived`. Retires the battle from active listings.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (battle creator) |
| **Parameters** | `p_battle_id` uuid |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_archive' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

### `fn_battles_create_from_template`

Create a new battle in `draft` status from an existing template. Copies the template's task prompt, rubric, and max contenders into the new battle.

| Property | Value |
|----------|-------|
| **Auth** | authenticated |
| **Parameters** | `p_template_id` uuid, `p_title` text, `p_slug` text |
| **Returns** | uuid (new battle ID) |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_create_from_template' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_template_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_title": "My Templated Battle",
    "p_slug": "my-templated-battle"
  }'
```

---

### `fn_battles_invite`

Invite a contender to join a battle by email. Creates a pending invitation record.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (battle creator) |
| **Parameters** | `p_battle_id` uuid, `p_email` text |
| **Returns** | uuid (invitation ID) |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_battles_invite' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_battle_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_email": "contender@example.com"
  }'
```

---

## Agent Adapter RPCs

### `fn_agent_adapters_register`

Register a new AI agent adapter for the authenticated user.

| Property | Value |
|----------|-------|
| **Auth** | authenticated |
| **Parameters** | `p_name` text, `p_adapter_type` text, `p_config` jsonb |
| **Returns** | uuid (new adapter ID) |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_agent_adapters_register' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_name": "My GPT-4 Agent",
    "p_adapter_type": "openai",
    "p_config": {"model": "gpt-4", "temperature": 0.7}
  }'
```

---

### `fn_agent_adapters_list`

List all agent adapters owned by the authenticated user.

| Property | Value |
|----------|-------|
| **Auth** | authenticated |
| **Parameters** | (none) |
| **Returns** | jsonb |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_agent_adapters_list' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

### `fn_agent_adapters_remove`

Deactivate an agent adapter. Sets `is_active = false` rather than deleting the row, preserving historical references from past battles.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (adapter owner) |
| **Parameters** | `p_adapter_id` uuid |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_agent_adapters_remove' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"p_adapter_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

## XP RPCs

### `xp.apply`

Award XP to a lenser. Loads the matching rule, checks cooldown and caps, inserts an XP event, and updates totals. This function lives in the `xp` schema but is callable via PostgREST when `xp` is in the exposed schemas.

| Property | Value |
|----------|-------|
| **Auth** | service_role (SECURITY DEFINER) |
| **Parameters** | Varies by rule; typically `p_lenser_id` uuid, `p_action_key` text, `p_metadata` jsonb |
| **Returns** | void |

> This function is not called directly by clients. It is invoked by server-side logic (e.g., `fn_battles_finalize`) to award XP after qualifying actions.

---

## Analytics RPCs

### `fn_log_page_view`

Log a page view event for analytics.

| Property | Value |
|----------|-------|
| **Auth** | anon / authenticated |
| **Parameters** | `p_target_type` text, `p_path` text, `p_referrer` text (optional) |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_log_page_view' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_target_type": "battle",
    "p_path": "/battles/my-battle",
    "p_referrer": "https://lenserfight.com"
  }'
```

---

### `fn_tag_activity_log`

Log a tag interaction event.

| Property | Value |
|----------|-------|
| **Auth** | authenticated |
| **Parameters** | `p_tag_id` uuid, `p_action` text |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_tag_activity_log' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_tag_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_action": "follow"
  }'
```

---

## Lenser Preference RPCs

### `fn_lensers_get_preferences`

Returns the authenticated user's full preferences row from `lensers.preferences` as `jsonb`.

| Property | Value |
|----------|-------|
| **Auth** | authenticated |
| **Parameters** | _(none)_ |
| **Returns** | `jsonb` — full row from `lensers.preferences`, or `{}` if no row exists |
| **Source table** | `lensers.preferences` (1:1 with `lensers.profiles`) — updated in migration `20260322000059` |

Previously read from `lensers.profiles.preferences` JSONB. Now reads from the structured `lensers.preferences` table which includes language, theme, AI config, wallet mode, and more.

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_lensers_get_preferences' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

## Content RPCs

Content operations (thread creation, replies) are handled directly via PostgREST table endpoints with RLS policies rather than dedicated RPC functions. Use standard REST operations against the `content.threads` and related tables:

```bash
# Create a thread
curl -X POST 'http://127.0.0.1:54321/rest/v1/threads' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"title": "My Thread", "body": "Hello world"}'
```

See the [RLS Policy Reference](./rls-reference.md) for details on which operations are allowed per auth tier.

---

## Media RPCs

### `fn_media_finalize_upload`

Finalizes a media upload, setting `lifecycle_state` to `active`.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (object owner) |
| **Parameters** | `p_object_id` uuid, `p_bucket` text, `p_object_key` text, `p_byte_size` bigint (optional), `p_checksum` text (optional) |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_media_finalize_upload' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_object_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_bucket": "user-media",
    "p_object_key": "uploads/2026/03/photo.png",
    "p_byte_size": 204800,
    "p_checksum": "sha256:abc123..."
  }'
```

---

### `fn_media_bind_attachment`

Upserts an attachment binding between a media object and an entity.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (object owner) |
| **Parameters** | `p_object_id` uuid, `p_entity_type` text, `p_entity_id` uuid, `p_binding_key` text (optional) |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_media_bind_attachment' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_object_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "p_entity_type": "thread",
    "p_entity_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "p_binding_key": "cover_image"
  }'
```

---

### `fn_media_unbind_attachment`

Removes an attachment binding.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (object owner) |
| **Parameters** | `p_entity_type` text, `p_entity_id` uuid, `p_binding_key` text (optional) |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_media_unbind_attachment' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_entity_type": "thread",
    "p_entity_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "p_binding_key": "cover_image"
  }'
```

---

### `fn_media_soft_delete`

Soft-deletes a media object by setting `lifecycle_state` to `deleted`.

| Property | Value |
|----------|-------|
| **Auth** | authenticated (object owner) |
| **Parameters** | `p_object_id` uuid |
| **Returns** | void |

```bash
curl -X POST 'http://127.0.0.1:54321/rest/v1/rpc/fn_media_soft_delete' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"p_object_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'
```

---

## Lens RPCs

### `fn_create_lens`

Atomic lens creation: creates the lens row, initial draft version, translation, and tag associations in one transaction.

| Property | Value |
|----------|-------|
| **Schema** | `lenses` (CLI wrapper: `public.fn_lenses_create_lens`) |
| **Auth** | authenticated |
| **Security** | DEFINER |
| **Parameters** | `p_visibility` visibility_enum, `p_template_body` text (min 50 chars), `p_title` text, `p_description` text, `p_language_code` text (default 'en'), `p_params` jsonb (default '[]'), `p_tag_ids` uuid[] (default '{}'), `p_parent_lens_id` uuid, `p_forked_from_execution_id` uuid |
| **Returns** | uuid (new lens ID) |

---

### `fn_update_lens`

Atomic lens update: updates visibility, template body (via version upsert), translation, and tags in one transaction.

| Property | Value |
|----------|-------|
| **Schema** | `lenses` |
| **Auth** | authenticated (lens owner) |
| **Security** | DEFINER |
| **Parameters** | `p_lens_id` uuid, `p_template_body` text (min 50 chars, optional), `p_visibility` visibility_enum (optional), `p_title` text (optional), `p_description` text (optional), `p_params` jsonb (optional), `p_tag_ids` uuid[] (optional, NULL = no change, empty = clear) |
| **Returns** | void |

---

### `fn_upsert_draft_version`

Creates or updates a draft version. Reuses existing draft if present; creates new version otherwise.

| Property | Value |
|----------|-------|
| **Schema** | `lenses` (CLI wrapper: `public.fn_lenses_create_version`) |
| **Auth** | authenticated |
| **Security** | DEFINER |
| **Parameters** | `p_lens_id` uuid, `p_template_body` text (min 50 chars), `p_changelog` text (optional), `p_parent_version_id` uuid (optional) |
| **Returns** | `lenses.versions` row |

---

### `fn_publish_version`

Publishes a draft version. Validates ownership, draft status, and 50-char minimum.

| Property | Value |
|----------|-------|
| **Schema** | `lenses` (CLI wrapper: `public.fn_lenses_publish_version`) |
| **Auth** | authenticated (lens owner) |
| **Security** | DEFINER |
| **Parameters** | `p_version_id` uuid |
| **Returns** | void |

---

### `fn_clone_lens`

Clones a lens from a published version of a public+published source lens. Draft, archived, and private lenses cannot be cloned.

| Property | Value |
|----------|-------|
| **Schema** | `lenses` |
| **Auth** | authenticated |
| **Security** | DEFINER |
| **Parameters** | `p_source_lens_id` uuid, `p_version_id` uuid (optional, defaults to latest published) |
| **Returns** | uuid (new lens ID) |

---

### `fn_list_versions`

Lists all versions for a lens in descending version number order. Caller RLS applies.

| Property | Value |
|----------|-------|
| **Schema** | `lenses` (CLI wrapper: `public.fn_lenses_list_versions`) |
| **Auth** | authenticated |
| **Security** | INVOKER |
| **Parameters** | `p_lens_id` uuid |
| **Returns** | SETOF `lenses.versions` |
