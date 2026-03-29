# API Overview

LenserFight exposes a REST API via the **API gateway** (`lf-api-gateway`), a Cloudflare Worker that routes requests to internal workers by path prefix. All platform features (wallet, execution, billing) are served through this single gateway.

::: warning API URL is determined by NODE_ENV
**The API base URL changes based on your environment:**

| Environment | URL |
|-------------|-----|
| Production (`NODE_ENV=production`) | `https://api.lenserfight.com` |
| Development (`NODE_ENV=development`) | `http://localhost:8786` |

Never hardcode the URL — always read it from the environment variable `VITE_API_URL` (frontend) or `NODE_ENV` (server-side).
:::

## Request Routing

| Path prefix | Worker | Description |
|-------------|--------|-------------|
| `/wallet/*` | `lf-wallet-api` | Balance, transactions, checkout, pricing |
| `/execute/*` | `lf-execution-proxy` | AI model execution (wallet, BYOK, image, stream) |
| `/webhook/*` | `lf-billing-webhook` | LemonSqueezy billing events |

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

## Endpoints Summary

### Wallet API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/wallet/balance` | JWT | Get current credit balance |
| `GET` | `/wallet/transactions` | JWT | Get paginated transaction ledger |
| `POST` | `/billing/checkout` | JWT | Start a LemonSqueezy checkout session |
| `GET` | `/billing/products` | None | Active credit packs from DB (`billing.vw_products`) |
| `GET` | `/wallet/pricing` | JWT | Get model catalog with credit costs |

### Execution Proxy

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/execute/wallet` | JWT | Execute AI request (charges wallet credits) |
| `POST` | `/execute/byok` | JWT | Execute AI request (user's own API key, no charge) |
| `POST` | `/execute/image` | JWT | Generate images via Fal.ai FLUX (charges credits) |
| `POST` | `/execute/stream` | JWT | Stream AI tokens via SSE (charges credits) |

### Billing Webhook

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/webhook/lemonsqueezy` | HMAC-SHA256 | Receive and process LemonSqueezy order events |

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

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /execute/wallet` | 100 requests | Per minute per user |
| `POST /execute/image` | 30 requests | Per minute per user |
| `GET /wallet/balance` | 200 requests | Per minute per user |
| `GET /wallet/transactions` | 100 requests | Per minute per user |

Exceeded limits return **HTTP 429** with a `Retry-After` header.

## Versioning

Current version: **v1** (stable). Future versions will be prefixed (e.g. `/v2/execute/wallet`). Old versions are supported for **12 months** before deprecation.

## Related

- [How to Contribute](/how-to/contributors/how-to-contribute) — Contributing to LenserFight
- [CLI Reference](/reference/cli/index) — CLI command reference
