---
title: RLS Policy Reference
---

# RLS Policy Reference

## Overview

Row Level Security (RLS) is PostgreSQL's built-in mechanism for restricting which rows a given user can read or modify. LenserFight enables RLS on **every table** across all schemas. Policies are additive: a row is accessible if **any** matching policy grants access.

The `service_role` key bypasses RLS entirely and should only be used in trusted server-side contexts (Edge Functions, background jobs).

## Auth Tiers

| Tier | Description | RLS Behavior |
|------|-------------|--------------|
| `anon` | Unauthenticated requests (public API key only) | Restricted to explicitly public data |
| `authenticated` | Logged-in user with a valid JWT | Scoped to own data plus public data |
| `service_role` | Server-side key with elevated privileges | **Bypasses RLS completely** |

## Policy Inventory

### `lensers` Schema

#### `profiles`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | All rows | Public profile data |
| SELECT | authenticated | All rows | Public profile data |
| INSERT | authenticated | `user_id = auth.uid()` | User creates own profile |
| UPDATE | authenticated | `user_id = auth.uid()` | User edits own profile |
| DELETE | -- | Not allowed | Soft-delete via `deletion_requested_at` |

Soft-delete pattern: users set `deletion_requested_at` via UPDATE. A background job handles actual removal after a grace period.

---

### `content` Schema

#### `threads`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | `visibility = 'public'` | Public threads only |
| SELECT | authenticated | `visibility = 'public'` OR `lenser_id = lensers.get_auth_lenser_id()` | Own threads plus public |
| INSERT | authenticated | `lenser_id = lensers.get_auth_lenser_id()` | Create own threads |
| UPDATE | authenticated | `lenser_id = lensers.get_auth_lenser_id()` | Edit own threads |
| DELETE | authenticated | `lenser_id = lensers.get_auth_lenser_id()` | Delete own threads |

---

### `xp` Schema

#### `rules`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon / authenticated | All rows | Public reference data |
| INSERT / UPDATE / DELETE | service_role | -- | Admin-managed only |

#### `events`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | authenticated | `lenser_id = lensers.get_auth_lenser_id()` | Own events only |
| INSERT | -- | Via `xp.apply()` (SECURITY DEFINER) | Never inserted directly |

#### `totals`, `levels`, `streaks`, `seasons`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | authenticated | `lenser_id = lensers.get_auth_lenser_id()` | Read own data |
| INSERT / UPDATE / DELETE | -- | Managed by triggers and functions | No direct writes |

---

### `ai` Schema

#### `models`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon / authenticated | `is_public = true` | Public models only |
| INSERT / UPDATE / DELETE | service_role | -- | Admin-managed |

#### `generations`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | authenticated | `lenser_id = lensers.get_auth_lenser_id()` | Own generations |
| INSERT | authenticated | `lenser_id = lensers.get_auth_lenser_id()` | Create own |

---

### `battles` Schema

The battles schema has 11 tables with status-gated visibility.

#### `rubrics`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | `is_public = true` AND `deleted_at IS NULL` | Public rubrics |
| SELECT | authenticated | `is_public = true` OR `created_by = lensers.get_auth_lenser_id()` AND `deleted_at IS NULL` | Own + public |
| INSERT | authenticated | `created_by = lensers.get_auth_lenser_id()` | Create own |
| UPDATE | authenticated | `created_by = lensers.get_auth_lenser_id()` AND `deleted_at IS NULL` | Edit own |
| DELETE | -- | Not allowed | Soft-delete via `deleted_at` |

#### `rubric_criteria`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Rubric is public (`deleted_at IS NULL`) | Via public rubric |
| SELECT | authenticated | Rubric is public OR owned | Via accessible rubric |
| INSERT | authenticated | Rubric owned by user | Add criteria to own rubric |
| UPDATE | authenticated | Rubric owned by user | Edit criteria on own rubric |

#### `battles`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | `status IN ('voting', 'scoring', 'closed', 'published')` AND `deleted_at IS NULL` | Status-gated public visibility |
| SELECT | authenticated | Public statuses OR `created_by = lensers.get_auth_lenser_id()` (includes drafts) | Own drafts + public battles |
| INSERT | authenticated | `created_by = lensers.get_auth_lenser_id()` | Create own battles |
| UPDATE | authenticated | `created_by = lensers.get_auth_lenser_id()` AND `status IN ('draft', 'open')` | Edit own draft/open battles only |

#### `contenders`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Battle is in a public status | Visible on public battles |
| SELECT | authenticated | Battle is public OR user is the contender (`lenser_id = lensers.get_auth_lenser_id()`) | Self-see for human contenders |
| INSERT | authenticated | Battle is open OR user owns the battle | Join open battles or add contenders to own battles |

#### `submissions`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Battle `status IN ('voting', 'scoring', 'closed', 'published')` | Visible once voting starts |
| SELECT | authenticated | Battle is voting+ OR user is the contender | Own submissions always visible |
| INSERT | authenticated | User is the contender AND battle `status = 'open'` | Submit during open phase |
| UPDATE | authenticated | User is the contender AND battle `status = 'open'` | Revise before voting |

#### `votes`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Battle `status IN ('closed', 'published')` | Votes revealed after close |
| SELECT | authenticated | Battle is closed+ OR `voter_id = lensers.get_auth_lenser_id()` | Own votes always visible |
| INSERT | authenticated | Battle `status = 'voting'` AND voter is NOT a contender | Non-contenders only |
| DELETE | authenticated | `voter_id = lensers.get_auth_lenser_id()` AND battle `status = 'voting'` | Remove own vote during voting |
| UPDATE | -- | Not allowed | Immutable; use DELETE + INSERT |

#### `scorecards`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon / authenticated | Battle `status IN ('closed', 'published')` | Public after close |
| INSERT / UPDATE / DELETE | service_role | -- | System-generated only |

#### `templates`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | `is_public = true` AND `deleted_at IS NULL` | Public templates |
| SELECT | authenticated | `is_public = true` OR `creator_lenser_id = lensers.get_auth_lenser_id()` AND `deleted_at IS NULL` | Own + public |
| INSERT | authenticated | `creator_lenser_id = lensers.get_auth_lenser_id()` | Create own |
| UPDATE | authenticated | `creator_lenser_id = lensers.get_auth_lenser_id()` AND `deleted_at IS NULL` | Edit own |
| DELETE | -- | Not allowed | Soft-delete via `deleted_at` |

#### `agent_adapters`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | authenticated | `owner_lenser_id = lensers.get_auth_lenser_id()` | Own adapters only |
| INSERT | authenticated | `owner_lenser_id = lensers.get_auth_lenser_id()` | Register own |
| UPDATE | authenticated | `owner_lenser_id = lensers.get_auth_lenser_id()` | Edit own (including deactivation) |
| DELETE | -- | Not allowed | Deactivated via `is_active = false` |

#### `events`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Battle is in a public status (`voting` or later) | Visible on public battles |
| SELECT | authenticated | Battle is public OR `actor_id = lensers.get_auth_lenser_id()` | Own events + public battle events |
| INSERT | -- | Via RPC functions (SECURITY DEFINER) | Never inserted directly |
| UPDATE / DELETE | -- | Not allowed | Immutable audit log |

#### `invitations`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | authenticated | `invited_by = lensers.get_auth_lenser_id()` OR `invited_lenser_id = lensers.get_auth_lenser_id()` | Inviter sees sent, invitee sees received |
| INSERT | -- | Via `fn_battles_invite` (SECURITY DEFINER) | Never inserted directly |
| UPDATE | authenticated | `invited_lenser_id = lensers.get_auth_lenser_id()` AND `status = 'pending'` | Invitee can accept/decline |
| DELETE | -- | Not allowed | Preserved for audit |

---

### `tenancy` Schema

#### `workspaces`

| Policy | Operation | Tier | Condition | Notes |
|--------|-----------|------|-----------|-------|
| `members_select_own_workspaces` | SELECT | authenticated | User is a member of the workspace | Members can see their own workspaces |
| `admin_update_workspace` | UPDATE | authenticated | User is admin/owner of the workspace | Admin/owner can update workspace |
| `authenticated_insert_workspace` | INSERT | authenticated | `owner_id = lensers.get_auth_lenser_id()` | Authenticated users can create workspaces they own |

#### `workspace_members`

| Policy | Operation | Tier | Condition | Notes |
|--------|-----------|------|-----------|-------|
| `members_select_same_workspace` | SELECT | authenticated | User is a member of the same workspace | Members can see co-members |
| `admin_insert_members` | INSERT | authenticated | User is admin/owner of the workspace | Admin/owner can add members |
| `admin_delete_members` | DELETE | authenticated | User is admin/owner of the workspace | Admin/owner can remove members |

---

### `media` Schema

#### `objects`

| Policy | Operation | Tier | Condition | Notes |
|--------|-----------|------|-----------|-------|
| `authenticated_select_own_or_public` | SELECT | authenticated | Owner, public visibility, or workspace member | Owner, public, or workspace member |
| `anon_select_public` | SELECT | anon | `visibility = 'public'` | Public objects visible to anonymous |
| `authenticated_insert_own` | INSERT | authenticated | Owner + workspace member | Owner + workspace member can create |
| `authenticated_update_own` | UPDATE | authenticated | `owner_id = lensers.get_auth_lenser_id()` | Owner can update |
| `authenticated_delete_own` | DELETE | authenticated | `owner_id = lensers.get_auth_lenser_id()` | Owner can delete |

#### `attachments`

| Policy | Operation | Tier | Condition | Notes |
|--------|-----------|------|-----------|-------|
| `authenticated_select_attachments` | SELECT | authenticated | Parent object is accessible to user | Can see if object is accessible |
| `anon_select_public_attachments` | SELECT | anon | Parent object is public | Public object attachments visible to anon |
| `authenticated_insert_attachments` | INSERT | authenticated | User owns the parent object | Object owner can attach |
| `authenticated_delete_attachments` | DELETE | authenticated | User owns the parent object | Object owner can detach |

---

### `lenses` Schema

#### `lenses`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | `visibility = 'public' AND status = 'published'` | Public published only |
| SELECT | authenticated | `(visibility IN ('public','community') AND status = 'published') OR lenser_id = owner` | Own + public/community |
| INSERT | authenticated | `is_active_lenser(uid()) AND lenser_id = current_active_lenser_id()` | Active lenser check |
| UPDATE | authenticated | Same owner check in USING + WITH CHECK | Owner only |
| DELETE | authenticated | Same owner check | Owner only |

#### `versions`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Parent lens is public + published | Via public lens |
| SELECT | authenticated | Parent lens owner OR public/community + published | Own + public |
| INSERT | authenticated | Parent lens owned by caller | Create on own lens |
| UPDATE | authenticated | Parent lens owned by caller AND version status = draft | Draft only |

#### `version_parameters`

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Parent lens is public + published | Via public lens |
| SELECT | authenticated | Parent lens owner OR public/community + published | Own + public |
| INSERT | authenticated | Parent lens owned AND version is draft | Draft only |
| UPDATE | authenticated | Parent lens owned AND version is draft | Draft only |

#### `parameters` (DEPRECATED)

| Operation | Tier | Condition | Notes |
|-----------|------|-----------|-------|
| SELECT | anon | Parent lens is public + published | Read-only for all |
| SELECT | authenticated | Parent lens owner OR public/community + published | Read-only |

**Note:** `lenses.parameters` is deprecated. Use `lenses.version_parameters` instead.

#### Grant Summary

| Table | anon | authenticated |
|-------|------|---------------|
| `lenses` | SELECT | SELECT, INSERT, UPDATE, DELETE |
| `versions` | SELECT | SELECT, INSERT, UPDATE |
| `parameters` | SELECT | SELECT (read-only legacy) |
| `version_parameters` | SELECT | SELECT, INSERT, UPDATE, DELETE |
| `version_resources` | SELECT | SELECT, INSERT, DELETE |

---

## Common Patterns

### `lensers.get_auth_lenser_id()`

A helper function that maps `auth.uid()` (Supabase auth UUID) to the internal `lenser_id` in the `lensers.profiles` table. Used in most authenticated policies to avoid repeated subqueries.

### Immutable Votes

Votes cannot be updated. To change a vote, the user must DELETE their existing vote and INSERT a new one. This preserves an audit-friendly pattern and avoids partial-update edge cases.

### Soft-Delete

Tables using soft-delete (`rubrics`, `battles`, `templates`) include `deleted_at IS NULL` in their USING clauses. Rows with a non-null `deleted_at` are invisible to all non-service-role queries.

### Status-Gated Visibility

Battles progress through statuses: `draft` -> `open` -> `voting` -> `scoring` -> `closed` -> `published`. Anonymous users can only see battles at `voting` or later. Owners can always see their own battles regardless of status.
