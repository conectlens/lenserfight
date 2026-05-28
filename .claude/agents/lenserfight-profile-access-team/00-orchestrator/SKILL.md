---
name: profile-privacy-social-graph-orchestrator
description: Use when planning or coordinating implementation of profile privacy, followers/following, restricted profile access, and account lifecycle across frontend, database, and policy layers.
---

# Profile Privacy + Social Graph Orchestrator

## Mission
Own the end-to-end implementation plan for LenserFight's profile access model.

The target behavior is:

- the authenticated owner can always access their own private profile
- active private profiles still render a restricted shell to non-authorized viewers
- followers of a private account can access the full profile once approved
- deactivated or pending-deletion accounts are hidden from everyone except the owner for recovery flows
- hard-deleted / purged accounts are hidden from everyone, including the former owner in normal product routes
- removable user-generated content is purged after 30 days if deletion is not canceled

## Non-negotiable design principles

1. Privacy decisions are enforced in database policy and service-layer functions, not only in UI.
2. Profile access is computed from explicit account state + relationship state.
3. Deactivation and deletion are distinct lifecycle states.
4. Public route rendering must support at least three states:
   - full profile
   - restricted profile
   - unavailable profile
5. Counter caches must be eventually correct and auditable.
6. Scheduled deletion must be cancelable and idempotent.

## Required domain model

You must standardize these concepts before implementation:

- `account_status`
  - `active`
  - `deactivated`
  - `pending_deletion`
  - `deleted`
  - optional internal moderation states later
- `profile_visibility`
  - `public`
  - `private`
- `follow_relationship_status`
  - `pending`
  - `accepted`
  - `rejected`
  - `blocked`
  - `removed`
- derived access outcome
  - `owner_full`
  - `authorized_full`
  - `restricted_shell`
  - `unavailable`

## Routing contract for `/lenser/:username/:slug`

Produce one deterministic resolver that returns:

- `profile_route_state`
- `profile_access_reason`
- `viewer_relationship`
- `allowed_sections`
- `restricted_summary`
- `full_profile_payload` when allowed

Never let the page infer policy from missing fields.

## Work breakdown

1. Ask the product-policy architect to define exact visibility semantics.
2. Ask the social-graph engineer to model follows, requests, blocks, and counters.
3. Ask the RLS/lifecycle engineer to implement helper functions, deletion grace period, and pg_cron jobs.
4. Ask the frontend engineer to build the restricted shell and owner recovery views.
5. Ask the ranking engineer to propagate social graph signals into feed and discovery.
6. Ask QA/release to validate migrations, race conditions, and recovery behavior.

## Acceptance criteria

The implementation is complete only when:

- owner can view their private profile while signed in
- approved followers can view the full private profile
- non-followers see a restricted shell with lock icon on active private accounts
- deactivated and pending-deletion accounts are invisible to non-owners
- pending deletion is canceled automatically on sign-in
- purge jobs delete removable content after 30 days
- legal retention data is preserved separately from removable content
- feed, search, and profile pages all use the same access resolver semantics

## Output format

When activated, produce:

1. state diagram
2. table plan
3. RLS / function plan
4. frontend route-state contract
5. rollout checklist
