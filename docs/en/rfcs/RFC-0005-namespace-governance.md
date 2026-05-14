---
title: "RFC-0005: Namespace Governance Architecture"
description: Policy-driven, AI-assisted handle reservation system replacing the hardcoded CHECK constraint on lensers.profiles.
---

# RFC-0005: Namespace Governance Architecture

| | |
|---|---|
| **Status** | Accepted (NG-P0/P1 shipped 2027-12-19) |
| **Author** | Principal Architecture |
| **Phase** | NG-P0, NG-P1 |
| **Created** | 2027-12-19 |
| **Supersedes** | `lensers_reserved_handle_check` CHECK constraint |
| **Superseded by** | — |

## Summary

Replaces the eight-entry hardcoded `CHECK` constraint on `lensers.profiles`
with a data-driven namespace governance system. New providers, AI models, and
future product namespaces are protected by inserting rows — no code deployment
required.

## Motivation

The legacy constraint was:

```sql
CONSTRAINT "lensers_reserved_handle_check"
  CHECK (lower(handle) <> ALL (ARRAY[
    'lenser','lens','lena','lensa','lense','leni','len','lensizm'
  ]))
```

This approach has four critical failures:

1. **Static coverage.** Every new reserved handle requires a migration and
   deployment. There is no mechanism to react to new AI providers (DeepSeek,
   Groq, Cerebras) or models without a code change.

2. **Zero impersonation detection.** `0p3n4i` (leet for `openai`) and
   `аnthropik` (Cyrillic а) both pass the constraint. Visual, phonetic, and
   homoglyph attacks are completely undetected.

3. **No ecosystem protection.** The platform has three brand ecosystems
   (LenserFight, Chainabit, ConectLens) plus dozens of AI provider and model
   namespaces that need governance. Eight entries is insufficient.

4. **No operator visibility.** There is no registry, no classification, no
   audit, and no ability to query what is protected and why.

## Detailed design

See [Architecture: Namespace Governance](../explanation/architecture/namespace-governance.md)
for the full schema, function pipeline, security model, and examples.

### What shipped (NG-P0)

- `identity_gov` schema.
- `identity_gov.reserved_namespaces` — one table. Registry of exact handles,
  prefix/suffix/token/regex rules with `entry_kind`, `class`, `deny_score`,
  `source`, `expires_at`.
- `identity_gov.fn_normalize_handle` — IMMUTABLE 8-step normalizer: invisible
  char strip, NFKC, casefold, Cyrillic homoglyph fold, leet-speak fold,
  repeat collapse, filler suffix strip, separator trim.
- `identity_gov.fn_handle_skeleton` — IMMUTABLE TR-39 font-level confusable
  fold (rn→m, vv→w, ii→u).
- `identity_gov.fn_validate_handle` — STABLE 9-step Chain of Responsibility
  pipeline: syntax, normalize, exact, prefix/suffix/regex, composition, skeleton,
  levenshtein, trigram, phonetic.
- `public.fn_check_handle` — public read-through RPC (STABLE, granted to
  `authenticated` and `anon`).
- `BEFORE INSERT/UPDATE OF handle` trigger on `lensers.profiles` — hard
  enforcement gate; raises `P0001` on deny.
- Legacy `lensers_reserved_handle_check` constraint dropped.
- RLS `FORCE ROW LEVEL SECURITY` on `reserved_namespaces`; SELECT-only for
  client roles; all writes via `SECURITY DEFINER`.

### What shipped (NG-P1)

- Canonical seed: 4 system, 19 security, 13 LenserFight brand, 7 Chainabit
  brand, 28 AI provider, 24 AI model exact entries.
- Prefix guards: 8 high-risk brand prefixes.
- Suffix guards: 3 impersonation suffixes (official, verified, iam).
- Token guards: 13 composition tokens (lens, gpt, claude, gemini, llama, …).
- ON CONFLICT DO UPDATE — seed is idempotent; re-running never fails.

### TypeScript surface

- `@lenserfight/domain/identity-governance` — `NamespaceClass`, `EntryKind`,
  `EntrySource`, `ValidationVerdict`, `HandleValidationResult`,
  `ReservedNamespace`. Minimal; no new Nx library added beyond types.

### pgTAP coverage

- `supabase/tests/91_identity_gov_schema.sql` — 35 assertions: schema, table,
  indexes, RLS, FORCE RLS, anon write denial, function existence, trigger
  existence, legacy constraint removal, seed integrity.
- `supabase/tests/92_identity_gov_pipeline.sql` — 30 assertions: normalizer
  unit tests, each pipeline step, safe handle pass-through, trigger enforcement.

## Drawbacks

- **Single bundled migration** makes individual rollback harder. Mitigated by:
  idempotent DDL (`CREATE ... IF NOT EXISTS`, `ON CONFLICT DO UPDATE`), and the
  trigger can be disabled temporarily via `ALTER TABLE ... DISABLE TRIGGER`.
- **Filler suffix stripping** is aggressive. A user named `karinesupport`
  would have their handle normalized to `karine`, bypassing the suffix check
  but potentially matching a future `karine` reservation. Accepted — legitimate
  handles should not embed official moderation keywords.
- **No async AI Intel pipeline yet.** NG-P1 provides the `expires_at` column
  and `ai_inferred` source for future automated discovery; the worker is out of
  scope for this RFC.

## Alternatives considered

1. **Seven-table governance schema** (original NG-P0 draft). Rejected for
   over-engineering. A `namespace_policies` table (versioned weights), an
   `username_audits` table (hash-chained log), an `impersonation_reports`
   table, and a `moderator_keys` table are all valuable additions — but they
   belong in a future NG-P2 phase when audit requirements are defined.
   Shipping the minimal governance logic first is YAGNI-correct.

2. **Application-layer validation only.** Rejected. Database-level enforcement
   (trigger) is required so that direct SQL inserts (seeding, migrations, admin
   tools) cannot bypass governance.

3. **Extending lensers.profiles with a `governance_class` column.** Rejected.
   The registry is about *protected namespaces*, not about *profile attributes*.
   Mixing them creates a coupling where profile SELECT queries must join a
   governance table.

4. **External service (Redis / Node.js validation microservice).** Rejected.
   Adds network hops to a synchronous profile creation path. All logic
   expressible in Postgres extensions (`pg_trgm`, `fuzzystrmatch`) should stay
   in the database.

## Future work

| Phase | Scope |
|-------|-------|
| NG-P2 | Hash-chained `username_audits` table; event bus emission from trigger |
| NG-P3 | AI Intel worker: daily provider/model discovery via Anthropic Claude Haiku, auto-reserve `ai_inferred` entries |
| NG-P4 | `impersonation_reports` table + T&S moderation flow |
| NG-P5 | Forced-rename flow for existing handles in violation (grace window + email) |
| NG-P6 | Provider verification proof (DNS TXT challenge) for `provider` class claim |

## Unresolved questions

- Should `fn_check_handle` results be cached at the application layer (SWR 60s)?
  Currently advisory only; cache staleness cannot cause wrongful approvals on
  the write path (trigger re-validates).
- What is the appeal flow for users whose handle is flagged `escalate` (risk 40–69)?
  Currently escalated handles are allowed through but not flagged. NG-P2 will
  wire the event bus emission.
