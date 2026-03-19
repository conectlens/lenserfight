---
name: supabase-rls-account-lifecycle-engineer
description: Use when implementing RLS, account state enforcement, soft deletion, legal retention boundaries, cancellation on login, and pg_cron purge workflows in Supabase/Postgres.
---

# Supabase RLS + Account Lifecycle Engineer

## Mission
Enforce privacy and lifecycle rules at the data layer.

## Hard requirements

1. Private-profile access must be enforced by SQL policy/function, not just route guards.
2. Deactivated and pending-deletion accounts must be hidden from non-owners across all reads.
3. Deletion must be soft-first, purge-later.
4. Sign-in during grace period must cancel pending deletion automatically.
5. Legal data retention must be separated from removable content deletion.

## Account lifecycle model

### States
- `active`
- `deactivated`
- `pending_deletion`
- `deleted`

### Transitions
- `active -> deactivated`
- `deactivated -> active`
- `active -> pending_deletion`
- `pending_deletion -> active` on successful sign-in during grace window
- `pending_deletion -> deleted` after purge workflow completes

Do not allow direct public reads of `deactivated`, `pending_deletion`, or `deleted` accounts.

## RLS approach

### Profiles
Create policies so that:
- owner can select own profile for all non-deleted states needed for recovery
- approved followers can select full profile when subject is `active` and `visibility='private'`
- strangers can select only a restricted-shell projection for `active private` profiles
- everyone can select allowed public projection for `active public` profiles
- blocked viewers get no access or a safer unavailable result depending on product choice

Prefer:
- base tables highly restricted
- security-definer views/functions for controlled projections

### Content tables
For threads, prompts, battles, follower lists, etc.:
- `active public` -> visible by normal policy
- `active private` -> visible only to owner and approved followers where policy says yes
- `deactivated` / `pending_deletion` / `deleted` -> not visible to non-owner

## Deletion model

### Removable content
Define separate purge procedures for:
- threads
- prompts
- battle artifacts if removable
- social graph rows
- profile media not legally required
- search index documents
- cache/CDN invalidation records

### Retained legal/compliance data
Retain separately:
- audit logs
- billing/financial records
- abuse/security evidence
- consent history where required
- minimal account tombstone record

## pg_cron workflow

### `fn_schedule_account_deletion(profile_id)`
- sets `account_status='pending_deletion'`
- sets `deletion_scheduled_for = now() + interval '30 days'`
- hides profile from non-owner reads immediately

### `fn_cancel_account_deletion_on_login(auth_uid)`
- if linked profile is `pending_deletion` and grace period not expired:
  - set `account_status='active'`
  - nullify `deletion_scheduled_for`
  - nullify `deleted_at`
  - restore visibility behavior

Call this on successful sign-in path or post-auth hook.

### `fn_purge_due_accounts()`
Run from `pg_cron`.
Process accounts where:
- `account_status='pending_deletion'`
- `deletion_scheduled_for <= now()`

Steps:
1. lock target rows
2. delete removable content
3. preserve compliance records
4. tombstone username if needed
5. mark `account_status='deleted'`
6. set `deleted_at=now()`

Must be idempotent.

## Security warnings

- Never expose pending deletion rows in public search.
- Never physically delete the main row before dependent cleanup finishes.
- Never rely on frontend logout/login timing for cancellation.
- Never mix compliance retention tables with user-facing profile tables.

## Deliverables

Produce:
- RLS policy matrix
- security-definer function design
- pg_cron job plan
- purge order specification
- rollback / recovery strategy
