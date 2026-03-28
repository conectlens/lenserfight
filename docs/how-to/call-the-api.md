# Call the API

Step-by-step curl guide for every LenserFight platform API endpoint.

::: warning API URL varies by environment
Set your API URL before running any example:

```bash
# Production
export API_URL="https://api.lenserfight.com"

# Development
export API_URL="http://localhost:8786"
```
:::

## Step 1: Get a JWT Token

Most endpoints require a Supabase JWT. Get one via the auth endpoint:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

JWT=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"your-password"}' \
  | jq -r '.access_token')

export JWT
echo "JWT: $JWT"
```

### Device approval flow

The CLI uses a browser approval page for developer-token issuance:

```bash
lenserfight auth device request --label "MacBook Pro"
```

The command prints an approval code plus the auth app URL. Sign in at `LENSERFIGHT_AUTH_BASE_URL` and open `/device-approval` to approve the request. The CLI polls until the developer token is minted and then stores it separately from the session token.

---

## Wallet Endpoints

### Get Credit Balance

```bash
curl -X GET "$API_URL/wallet/balance" \
  -H "Authorization: Bearer $JWT"
```

**Response:**
```json
{
  "data": { "balance": 499900 },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 12 }
}
```

---

### Get Transaction History

```bash
curl -X GET "$API_URL/wallet/transactions?page=1&limit=20" \
  -H "Authorization: Bearer $JWT"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tx_type": "spend",
      "amount": 188,
      "direction": -1,
      "balance_after": 499712,
      "description": "AI execution: openai/gpt-4o",
      "reference_type": "execution.runs",
      "reference_id": "run_uuid",
      "created_at": "2026-03-20T15:30:00Z"
    }
  ],
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 23, "limit": 20, "offset": 0, "total": 127, "hasNextPage": true }
}
```

**Query parameters:** `page` (default: 1), `limit` (default: 20, max: 100).

---

### List Available Products

No authentication required.

```bash
curl -X GET "$API_URL/billing/products"
```

**Response:**
```json
{
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Clash Pack",
        "slug": "clash-pack",
        "description": null,
        "price_cents": 999,
        "credits_granted": 999,
        "pay_what_you_want": false,
        "buy_now_url": null,
        "test_mode": true,
        "variant_id": "uuid",
        "ls_variant_id": 1424384,
        "variant_name": "Default",
        "order_count": 14
      }
    ]
  },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 310 }
}
```

- `price_cents`: Price in USD cents (999 = $9.99)
- `credits_granted`: Credits awarded after purchase
- `variant_id`: Internal UUID — pass to `POST /billing/checkout`
- `order_count`: Number of paid orders — use to show a "Most Popular" badge

---

### Start a Checkout

```bash
# 1. Get the internal variant UUID from the products endpoint
VARIANT_ID=$(curl -s "$API_URL/billing/products" | jq -r '.data.products[] | select(.name=="Clash Pack") | .variant_id')

# 2. Start checkout using the internal variant UUID
curl -X POST "$API_URL/billing/checkout" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"variant_id\": \"$VARIANT_ID\"}"
```

**Response:**
```json
{
  "data": { "checkout_url": "https://lemonsqueezy.com/checkout/buy/..." },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 145 }
}
```

Open `checkout_url` in the browser and complete payment with test card `4242 4242 4242 4242`.

**Note:** Always fetch `variant_id` from `GET /billing/products` — do not hardcode it. After the user completes purchase, a webhook grants the product's `credits_granted` to their wallet.

---

### Get Model Pricing

```bash
curl -X GET "$API_URL/wallet/pricing" \
  -H "Authorization: Bearer $JWT"
```

**Response:**
```json
{
  "data": {
    "models": [
      {
        "model_key": "gpt-4o",
        "name": "GPT-4o",
        "provider": "openai",
        "provider_name": "OpenAI",
        "unit_type": "tokens",
        "sample_cost_usd": 0.021,
        "sample_cost_credits": 210
      }
    ]
  },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 18 }
}
```

---

## Execution Endpoints

### Execute with Wallet Credits

```bash
curl -X POST "$API_URL/execute/wallet" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "What is 2 + 2?" }
    ],
    "max_tokens": 100,
    "temperature": 0.7
  }'
```

**Response:**
```json
{
  "data": {
    "content": "2 + 2 = 4",
    "usage": { "input_tokens": 27, "output_tokens": 6 },
    "provider": "openai",
    "model": "gpt-4o",
    "credits_charged": 45
  },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 1380 }
}
```

Supported providers: `"openai"`, `"anthropic"`, `"google"`.

---

### Execute with Your Own API Key (BYOK)

```bash
curl -X POST "$API_URL/execute/byok" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "key_ref_id": "your-vault-key-uuid",
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [{ "role": "user", "content": "Hello!" }]
  }'
```

**Response:**
```json
{
  "data": {
    "content": "Hello! How can I help you?",
    "usage": { "input_tokens": 10, "output_tokens": 8 },
    "provider": "openai",
    "model": "gpt-4o"
  },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 1240 }
}
```

No `credits_charged` — BYOK uses your own API key, not platform credits.

---

### Generate Images (Fal.ai FLUX)

```bash
curl -X POST "$API_URL/execute/image" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fal-ai/flux/schnell",
    "prompt": "A cat wearing sunglasses on a beach",
    "num_images": 2,
    "image_size": "square_hd"
  }'
```

**Response:**
```json
{
  "data": {
    "urls": ["https://fal.media/files/...", "https://fal.media/files/..."],
    "units": 2,
    "credits_charged": 150
  },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 3420 }
}
```

Available models: `"fal-ai/flux/schnell"`, `"fal-ai/flux/dev"`, `"fal-ai/flux-pro"`.
Image sizes: `"square_hd"` (1024×1024), `"square"` (512×512), `"landscape_4_3"`, `"portrait_4_3"`.

::: tip
Image URLs expire after 1 hour — download them immediately if you need to persist them.
:::

---

### Stream AI Tokens (SSE)

::: tip Use `-N` with curl
The `-N` flag disables output buffering so tokens appear immediately as they arrive.
:::

```bash
curl -N -X POST "$API_URL/execute/stream" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [{ "role": "user", "content": "Write a haiku about streaming." }],
    "max_tokens": 100
  }'
```

**Example output:**
```
data: {"event":"start","provider":"openai","model":"gpt-4o","run_id":"a1b2c3d4-..."}

data: {"event":"token","content":"Rivers"}

data: {"event":"token","content":" flow"}

data: {"event":"end","usage":{"input_tokens":14,"output_tokens":9},"credits_charged":28}
```

See [Streaming Architecture](/explanations/streaming) for event reference and client integration guide.

---

## Error Handling

All errors use the `ApiResponseEnvelope` format:

```json
{
  "error": {
    "code": "wallet.insufficient_balance",
    "message": "Not enough credits to complete the operation"
  },
  "meta": { "requestId": "req_7f3a1c9e", "durationMs": 5 }
}
```

| HTTP Status | Action |
|-------------|--------|
| 400 | Check request format and required fields |
| 401 | JWT invalid or expired — get a new token |
| 402 | Insufficient credits — buy more at `/store` |
| 403 | Account frozen — contact support |
| 404 | Model or resource not found |
| 429 | Rate limit exceeded — wait and retry |
| 502/503 | Upstream error — retry with backoff |

## Related

- [API Overview](/reference/api-overview) — Full endpoint and error code reference
- [Integrate API](/how-to/integrate-api) — TypeScript client setup and error handling
- [Streaming Architecture](/explanations/streaming) — SSE protocol deep-dive
