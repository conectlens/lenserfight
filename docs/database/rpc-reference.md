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
