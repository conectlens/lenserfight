---
name: supabase-social-graph-engineer
description: Use when designing Postgres/Supabase schema, triggers, helper functions, and query patterns for follows, follower requests, mutuals, blocks, counters, and profile access relationships.
---

# Supabase Social Graph Engineer

## Mission
Design the canonical social graph for follows, approvals, blocks, and derived friendship.

## Required stance
Use an asymmetric follow model as the primitive. Do not use a symmetric friendship table as the foundation.

## Core tables

### `lensers.profiles`
Must include or reference:
- `profile_id`
- `account_id`
- `username`
- `slug`
- `visibility` enum: `public|private`
- `account_status` enum: `active|deactivated|pending_deletion|deleted`
- `deleted_at`
- `deletion_scheduled_for`
- `deactivated_at`
- summary fields for restricted shell

### `lensers.relationships`
One row per directed relationship from viewer to subject.

Columns:
- `source_profile_id`
- `target_profile_id`
- `status` enum: `pending|accepted|rejected|blocked|removed`
- `requested_at`
- `responded_at`
- `accepted_at`
- `removed_at`
- `is_close_circle` boolean default false
- `created_by_policy` text nullable
- unique `(source_profile_id, target_profile_id)`

### `lensers.profile_counters`
Denormalized counters:
- `followers_count`
- `following_count`
- `mutuals_count` optional
- `threads_count_public`
- `prompts_count_public`
- `badges_count`

### Optional `lensers.blocks`
You may keep blocks in `relationships.status='blocked'`, but a dedicated block table is cleaner if moderation rules grow.

## Required helper functions

### `fn_relationship_state(viewer_profile_id, subject_profile_id)`
Returns:
- direct relationship status
- reverse relationship status
- `is_mutual_follow`
- `is_blocked_any_direction`

### `fn_can_view_profile(viewer_auth_uid, subject_profile_id)`
Returns:
- access outcome
- access reason
- can_view_full_profile
- can_view_restricted_shell
- can_request_follow
- can_cancel_request
- can_unfollow

### `fn_request_follow(subject_profile_id)`
Rules:
- public account => create accepted follow immediately
- private active account => create pending request
- deactivated / pending_deletion / deleted => reject
- blocked relation any direction => reject

### `fn_accept_follow_request(source_profile_id)`
Only target owner may accept.

### `fn_remove_follow(target_profile_id)`
Soft-remove relation or switch to `removed`.

## Derived friendship

Friendship is computed, not stored as the main truth:
- `is_friend = exists accepted(A->B) and accepted(B->A)`

Only materialize it if analytics/search need acceleration.

## Counter maintenance

Use triggers or queued jobs to maintain:
- follower / following counts
- public-content counts

Favor correctness over micro-optimization.

## Query rules

1. Never join raw relations in ad hoc frontend queries for access decisions.
2. Expose a single profile-access RPC or security-definer view.
3. All search/discovery endpoints must filter `account_status='active'`.

## Suggested indexes

- unique `(source_profile_id, target_profile_id)`
- btree `(target_profile_id, status)`
- btree `(source_profile_id, status)`
- partial index for `status='pending'`
- partial index for `status='accepted'`
- index on `profiles(username)`
- index on `profiles(slug)`
- index on `profiles(account_status, visibility)`

## Deliverables

Produce:
- normalized schema
- constraints
- indexes
- trigger plan
- RPC contract
