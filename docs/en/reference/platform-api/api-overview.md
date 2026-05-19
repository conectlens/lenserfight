# Execution Platform Overview

This page is intentionally narrow: it documents the limited **execution-related HTTP endpoints** that Community Edition already references.

It is **not** the canonical onboarding surface for the full product. For OSS developers, start with [Community API](/en/reference/community-api/index) and treat this page as execution-platform notes only.

> **Integrating from an external AI agent or SaaS?** See the [AI Agent Integration Guide](/en/how-to/integrations/ai-agent-integration) for a step-by-step walkthrough with token setup, curl examples, and response parsing.

## Community API vs. Platform API

Choose the right entry point before building your integration:

| | Community API | Platform API (this page) |
|-|--------------|--------------------------|
| **Base URL** | Your Supabase instance | `https://api.lenserfight.com` |
| **Auth** | Supabase JWT or anon key | Bearer token (`LENSERFIGHT_API_KEY`) |
| **Purpose** | Full CRUD: lenses, lensers, threads, agents, workflows | Execution, billing, streaming |
| **Start here if** | Building on top of the OSS data layer | Triggering AI execution or handling credits |
| **Docs** | [Community API Reference](/en/reference/community-api/index) | This page |

Most integrations use both: the Community API to read lens and workflow definitions, and the Platform API to execute them.

---

::: warning API URL is determined by ENV_MODE
**The API base URL changes based on your environment:**

| Environment | URL |
|-------------|-----|
| Production (`ENV_MODE=production`) | `https://api.lenserfight.com` |
| Development (`ENV_MODE=development`) | `http://localhost:8786` |

Never hardcode the URL — always read it from the environment variable `API_URL` (frontend) or `ENV_MODE` (server-side).
:::

## Current HTTP surface

| Path prefix | Worker | Description |
|-------------|--------|-------------|
| `/wallet/*` | `lf-wallet-api` | Balance, transactions, checkout, pricing |
| `/execute/*` | `lf-execution-proxy` | AI model execution (wallet, BYOK, image, stream) |
| `/webhook/*` | `lf-billing-webhook` | LemonSqueezy billing events |

Community Edition should only rely on the `/execute/*` endpoints already used by the repo.

## Authentication

### JWT (User Context)

User-facing endpoints require a **Supabase JWT** via the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The JWT is obtained by signing in via Supabase Auth. The lenser ID is extracted from the JWT `sub` claim.

### API Key (Internal/Service)

Internal service-to-service endpoints use the platform API key via the `X-Platform-Api-Key` header. Only internal workers have this key — regular users cannot access these endpoints.

## Response Contract

Every endpoint returns `ApiResponseEnvelope<T>`:

```typescript
{
  data?: T       // Present on success
  error?: ApiError  // Present on failure
  meta?: ApiMeta    // Always present
}
```

### ApiMeta

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | `string` | Unique request ID. Include in bug reports. |
| `durationMs` | `number` | Server-side processing time in milliseconds. |
| `limit` | `number` | Page size (paginated endpoints only). |
| `offset` | `number` | Record offset from start (paginated endpoints only). |
| `total` | `number` | Total records available (paginated endpoints only). |
| `hasNextPage` | `boolean` | Whether more records exist (paginated endpoints only). |

### ApiError

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Machine-readable dot-notation code (e.g. `wallet.not_found`). |
| `message` | `string` | Human-readable explanation. |
| `details` | `object` | Optional structured details (e.g. validation field errors). |

## Execution endpoints summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/execute/wallet` | JWT | Execute AI request (charges wallet credits) |
| `POST` | `/execute/byok` | JWT | Execute AI request (user's own API key, no charge) |
| `POST` | `/execute/image` | JWT | Generate images via Fal.ai FLUX (charges credits) |
| `POST` | `/execute/stream` | JWT | Stream AI tokens via SSE (charges credits) |

## What this page does not promise

- a complete public platform API
- private worker contracts as a stable OSS integration surface
- public battles, benchmarking, or enterprise APIs
- self-host parity with private cloud execution infrastructure

## Error Code Reference

| `error.code` | HTTP Status | Meaning |
|-------------|-------------|---------|
| `auth.missing_token` | 401 | No `Authorization` header or not `Bearer` format |
| `auth.invalid_token` | 401 | JWT expired, malformed, or `sub` claim missing |
| `auth.profile_not_found` | 404 | JWT valid but lenser profile not found |
| `auth.unauthorized` | 401 | Missing or invalid `X-Platform-Api-Key` |
| `validation_error` | 400 | Request body or query failed schema validation — see `details` |
| `not_found` | 404 | No route matched the request path |
| `wallet.not_found` | 404 | Wallet account not found for this lenser |
| `wallet.insufficient_balance` | 402 | Not enough credits to complete the operation |
| `wallet.account_frozen` | 403 | Account suspended by admin |
| `wallet.spending_limit_exceeded` | 429 | Daily or monthly spend cap reached |
| `wallet.invalid_amount` | 400 | Amount is invalid (e.g. zero or negative) |
| `wallet.reservation_failed` | 503 | Wallet service unavailable during reservation |
| `pricing.not_found` | 404 | No pricing configured for this model |
| `execute.model_not_found` | 404 | Model not in catalog or not active |
| `execute.pricing_failed` | 500 | Credit cost calculation failed |
| `execute.invalid_messages` | 400 | Messages array failed sanitization |
| `execute.unsupported_provider` | 400 | Provider has no platform key configured |
| `execute.provider_failed` | 502 | AI provider returned an error |
| `execute.provider_mismatch` | 400 | Requested provider doesn't match BYOK key's provider |
| `execute.key_resolution_failed` | 403 | BYOK key not found or not owned by this user |
| `billing.variant_not_found` | 404 | LemonSqueezy variant not found in billing schema |
| `billing.session_failed` | 500 | Failed to create checkout session |
| `billing.upstream_error` | 502 | LemonSqueezy API returned an error |
| `webhook.invalid_signature` | 401 | HMAC signature mismatch |
| `webhook.invalid_json` | 400 | Webhook body is not valid JSON |
| `webhook.missing_session` | 400 | `session_id` not present in `custom_data` |
| `webhook.session_not_found` | 404 | Checkout session not found |
| `webhook.processing_failed` | 500 | Webhook handler threw an unexpected error |
| `internal_error` | 500 | Unhandled server error |

## Rate limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /execute/wallet` | 100 requests | Per minute per user |
| `POST /execute/image` | 30 requests | Per minute per user |

Exceeded limits return **HTTP 429** with a `Retry-After` header.

## Related

- [Providers and Execution](/en/reference/community-api/providers-and-execution)
- [Run Commands](/en/reference/cli/run)
- [Community API](/en/reference/community-api/index)
