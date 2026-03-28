# Integrate the API

How to connect LenserFight to the platform API safely and consistently — covering client setup, authentication, envelope handling, and error strategy.

## Overview

All platform API calls go through the API gateway at a URL determined by the environment:

```ts
// Never hardcode — read from environment
const API_BASE = import.meta.env.VITE_API_URL
// Production: https://api.lenserfight.com
// Development: http://localhost:8786
```

## Client Setup

Use `walletApiClient` and `executionApiClient` from `@lenserfight/data/repositories` — do not call `fetch` directly for platform endpoints.

```ts
import { walletService } from '@lenserfight/data/repositories'

// Get credit balance
const balance = await walletService.getBalance()

// List available credit packs
const products = await walletService.getProducts()

// Execute an AI request via wallet credits
const result = await walletService.executeWithWallet({
  provider: 'openai',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

## Auth App and Device Approval

The auth browser app has its own base URL, separate from the API gateway:

```ts
// Frontend and auth app
const authBaseUrl =
  import.meta.env.VITE_AUTH_BASE_URL ??
  'http://localhost:3004'
```

Use the device approval flow when you need a short-lived developer token for CLI automation:

```bash
lenserfight auth login --email you@example.com --password secret
lenserfight auth device request --label "Automation box"
```

The approval page is `/device-approval`. The resulting developer token is stored separately from the session JWT and can be rotated without invalidating the login session.

## Authentication

Every user-facing endpoint requires a Supabase JWT. The clients retrieve this automatically from the active session:

```ts
// Handled internally by walletApiClient / executionApiClient:
const { data } = await supabase.auth.getSession()
const jwt = data.session?.access_token
// Sent as: Authorization: Bearer <jwt>
```

If no session exists, the client throws `'Unauthenticated: cannot call wallet API without a valid session.'` before making the network request.

## Response Envelope

Every response follows `ApiResponseEnvelope<T>`:

```ts
import type { ApiResponseEnvelope } from 'contracts'

// Shape:
// { data?: T; error?: ApiError; meta?: ApiMeta }
```

The `unwrapEnvelope<T>` helper (from `apiFetch`) handles this automatically:

- On success → returns `data`
- On error (envelope `error` field present) → throws `ApiError` with `code` and `message`

```ts
import { unwrapEnvelope } from '@lenserfight/data/repositories'

const res = await apiFetch(`${API_BASE}/wallet/balance`, { headers: authHeader })
const balance = await unwrapEnvelope<{ balance: number }>(res)
```

For paginated endpoints, parse `meta` directly to get `total` and `hasNextPage`.

## Error Handling

Errors can come from two layers:

**1. HTTP errors** — `apiFetch` throws the parsed envelope body on non-2xx responses.

**2. Envelope errors** — `unwrapEnvelope` throws the `ApiError` object (`{ code, message, details? }`) when the response is 2xx but contains an `error` field.

Handle both the same way:

```ts
try {
  const balance = await walletService.getBalance()
} catch (err) {
  const apiErr = err as { code?: string; message?: string }
  if (apiErr.code === 'wallet.not_found') {
    // Wallet not yet created — prompt user to make first purchase
  } else if (apiErr.code === 'auth.invalid_token') {
    // JWT expired — redirect to login
  } else {
    // Generic fallback
    console.error(apiErr.message)
  }
}
```

See [API Overview](/reference/platform-api/api-overview) for the full error code reference.

## Retry Strategy

For transient errors (`execute.provider_failed`, `wallet.reservation_failed`, HTTP 502/503), use exponential backoff:

```ts
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isRetryable = [502, 503].includes((err as { status?: number }).status ?? 0)
      if (!isRetryable || attempt === maxAttempts) throw err
      await new Promise((r) => setTimeout(r, 2 ** (attempt - 1) * 1000))
    }
  }
  throw new Error('unreachable')
}

const result = await withRetry(() => walletService.executeWithWallet(req))
```

Do not retry on `402` (insufficient balance), `403` (frozen account), or `401` (invalid token) — these require user action.

## Streaming

For token-by-token streaming, use `walletApiClient.streamWithWallet()` directly:

```ts
import { walletApiClient } from '@lenserfight/data/repositories'

const controller = new AbortController()

await walletApiClient.streamWithWallet(
  { provider: 'openai', model: 'gpt-4o', messages },
  controller.signal,
  {
    onStart: (runId) => console.log('Stream started', runId),
    onToken: (content) => process.stdout.write(content),
    onEnd: (usage, creditsCharged) => console.log('Done', { usage, creditsCharged }),
    onError: (message, code) => console.error(code, message),
  },
)

// Abort early:
controller.abort()
```

See [Streaming Architecture](/explanation/battle-system/streaming) for a deep-dive on the SSE protocol and credit reservation lifecycle.

## Development vs Production

```ts
// .env.local (development)
VITE_API_URL=http://localhost:8786
VITE_AUTH_BASE_URL=http://localhost:3004

// .env.production
VITE_API_URL=https://api.lenserfight.com
VITE_AUTH_BASE_URL=https://auth.lenserfight.com
```

Never commit real API URLs to source — they are injected at build time via environment files. See [Environment Variables](/reference/platform-api/environment-variables) for all available variables.

## Related

- [Call the API](/how-to/battle-api/call-the-api) — Raw curl examples for every endpoint
- [API Overview](/reference/platform-api/api-overview) — Full endpoint and error code reference
- [Streaming Architecture](/explanation/battle-system/streaming) — SSE streaming internals
