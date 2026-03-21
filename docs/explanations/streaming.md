# Streaming Architecture

How `POST /execute/stream` works end-to-end — from credit reservation through SSE token delivery to settlement.

## Overview

The `/execute/stream` endpoint executes an AI request and emits the response token by token via **Server-Sent Events (SSE)**. Credits are reserved before the stream starts and settled (or released) after the final event.

```
Client                       Gateway              Wallet Worker        AI Provider
  │                             │                      │                    │
  ├─ POST /execute/stream ──────►                      │                    │
  │                             ├─ reserve credits ───►                    │
  │                             │                      ├─ ok ──────────────►
  │                             │◄─ reservation_id ────┤                    │
  │                             ├─ call AI ────────────────────────────────►
  │◄── event: start ────────────┤                      │                    │
  │◄── event: token ────────────┤◄─────────────────── stream tokens ───────┤
  │◄── event: token ────────────┤                      │                    │
  │◄── event: end ──────────────┤                      │                    │
  │                             ├─ settle credits ────►                    │
```

## SSE Event Reference

The response body is `text/event-stream`. Each event is a `data:` line followed by `\n\n`.

| Event | When emitted | Fields |
|-------|-------------|--------|
| `start` | Before first token | `provider`, `model`, `run_id` |
| `token` | Each content chunk | `content` (string delta) |
| `end` | After last token | `usage` (`input_tokens`, `output_tokens`), `credits_charged` |
| `error` | On failure or timeout | `message`, `code` |

**Example stream:**

```
data: {"event":"start","provider":"openai","model":"gpt-4o","run_id":"a1b2c3d4-..."}

data: {"event":"token","content":"Rivers"}

data: {"event":"token","content":" flow"}

data: {"event":"end","usage":{"input_tokens":14,"output_tokens":9},"credits_charged":28}
```

## Credit Lifecycle

1. **Reservation** — Credits are reserved (locked) before the AI call begins. If the wallet has insufficient balance, the stream never starts and an HTTP 402 is returned before any SSE events.
2. **Streaming** — Tokens are emitted as they arrive from the AI provider. The reservation remains locked.
3. **Settlement** — After `event: end`, credits are settled for actual usage. Any over-reserved credits are released.
4. **Error / Abort** — If the stream fails or the client disconnects, the reservation is released (not charged).

## HTTP Errors Before Stream Starts

If the request fails before streaming begins (e.g. invalid token, insufficient balance), the gateway returns a standard `ApiResponseEnvelope` error — **not** an SSE stream:

```json
{
  "error": { "code": "wallet.insufficient_balance", "message": "Not enough credits" },
  "meta": { "requestId": "req_7f3a1c9e" }
}
```

These are returned with the appropriate HTTP status code (401, 402, 403, etc.).

## Client Integration

Use `walletApiClient.streamWithWallet()` from `@lenserfight/data/repositories`:

```ts
import { walletApiClient } from '@lenserfight/data/repositories'

const controller = new AbortController()

await walletApiClient.streamWithWallet(
  {
    provider: 'openai',
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Write a haiku about streaming.' }],
    max_tokens: 100,
  },
  controller.signal,
  {
    onStart: (runId) => {
      console.log('Stream started, run ID:', runId)
    },
    onToken: (content) => {
      // Append to UI incrementally
      appendToOutput(content)
    },
    onEnd: (usage, creditsCharged) => {
      console.log(`Done. Used ${usage.input_tokens}in + ${usage.output_tokens}out tokens. Charged ${creditsCharged} credits.`)
    },
    onError: (message, code) => {
      console.error(`Stream error [${code}]: ${message}`)
    },
  },
)

// To abort early (e.g. user clicks Stop):
controller.abort()
```

## React Integration Pattern

```tsx
const [output, setOutput] = useState('')
const [state, setState] = useState<StreamState>('idle')
const controllerRef = useRef<AbortController | null>(null)

async function run() {
  setState('loading')
  setOutput('')
  controllerRef.current = new AbortController()

  try {
    await walletApiClient.streamWithWallet(req, controllerRef.current.signal, {
      onStart: () => setState('streaming'),
      onToken: (t) => setOutput((prev) => prev + t),
      onEnd: () => setState('complete'),
      onError: (msg, code) => {
        setState('error')
        console.error(code, msg)
      },
    })
  } catch (err) {
    if ((err as Error).name !== 'AbortError') setState('error')
  }
}

function stop() {
  controllerRef.current?.abort()
  setState('idle')
}
```

## Related

- [API Overview](/reference/api-overview) — Full endpoint and error code reference
- [Integrate API](/how-to/integrate-api) — Client setup and error handling guide
- [Call the API](/how-to/call-the-api) — Curl examples including streaming
