---
title: Security
description: How LenserFight protects your data, keys, and identity — the security model explained.
---

# Security

LenserFight is built on a security-first architecture. This page explains the key security properties, data access model, and measures that protect users and their data.

## Authentication & identity

All authenticated actions require a valid JWT issued by Supabase Auth. Tokens are:
- Short-lived and refreshed automatically
- Tied to a single `auth.users` row
- Required for all write operations

The platform never stores your model provider API keys in plaintext.

## Row-Level Security (RLS)

Every table in the database has RLS enabled. Data access is enforced at the database level — not just the application layer. The database itself enforces:

- Users can only read their own private data
- Users can only write to rows they own
- Public content is read-accessible to all authenticated users
- Anonymous reads are permitted only for public, published content

RLS is the first line of defense. Even if an application bug bypasses API-layer checks, the database will reject unauthorized access.

## BYOK: Your keys never leave your control

The Bring Your Own Key (BYOK) model means your AI provider API keys are under your control:

- **Cloud BYOK**: Keys stored in Supabase Vault, encrypted at rest. Only the service role can decrypt them at execution time. Keys are never returned to the client.
- **Local BYOK**: Keys stay on your machine entirely. The platform never receives them. You pass them at execution time via CLI environment variables.

The platform uses a key reference ID — never the raw key value — when passing execution context.

## Minimal surface area

- The `anon` (public) key only has read access to explicitly public data
- Write operations always require auth tokens
- Admin operations require the `service_role` key (server-side only)
- All user-facing APIs are read-only for unauthenticated users

## Open-core auditability

The core platform code is open source. You can review:
- All RLS policies
- All database functions and triggers
- All data access patterns in the repository

If you find a security issue, please follow our [Security Policy](/en/how-to/contributors/security).

## Data residency

User data is stored in the Supabase cloud region chosen at project setup. LenserFight does not replicate data across unexpected regions.

## Sensitive data handling

| Data type | Storage approach |
|-----------|-----------------|
| Auth credentials | Supabase Auth (bcrypt hash) |
| AI provider API keys | Supabase Vault (AES-256 encrypted) |
| Evaluation content | Supabase Postgres (RLS-protected) |
| User profiles | Supabase Postgres (RLS-protected) |
| Session tokens | Client-side (short-lived JWT) |

## Related

- [RLS Reference](/en/reference/database/rls-reference)
- [Security Policy](/en/how-to/contributors/security)
