# Worker Environment Variables

All variables are read at process startup. None require a restart-safe reload mechanism — restart the worker after changing them.

## Required

These three variables must always be set. The worker uses the service-role key to bypass RLS when claiming and completing jobs.

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL. Local: `http://localhost:54321`. Cloud: `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key (used to initialise the Supabase client). Get it from Project Settings → API. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. **Never expose this to the browser.** Get it from Project Settings → API. |

## Sub-worker toggles

By default, the polling sub-workers (battle, scheduled workflow, team run) are **off** — you must opt in. The event-driven sub-workers (vote anomaly, auto-promote, webhook drain, workflow dispatch) are **on** by default.

| Variable | Default | Description |
|---|---|---|
| `PLATFORM_API_BATTLE_WORKER_ENABLED` | `''` (off) | Set to `true` to process battle AI jobs. |
| `PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED` | `''` (off) | Set to `true` to process scheduled/cron workflows. |
| `PLATFORM_API_TEAM_RUN_WORKER_ENABLED` | `''` (off) | Set to `true` to process agent team runs. |
| `PLATFORM_API_VOTE_ANOMALY_WORKER_ENABLED` | `true` | Set to `false` to disable the Realtime vote anomaly subscriber. |
| `PLATFORM_API_AUTO_PROMOTE_WORKER_ENABLED` | `true` | Set to `false` to disable battle auto-promote polling. |
| `PLATFORM_API_WEBHOOK_DRAIN_ENABLED` | `true` | Set to `false` to disable outbound webhook delivery. |
| `PLATFORM_API_WORKFLOW_DISPATCH_ENABLED` | `true` | Set to `false` to disable workflow event broadcasting to Realtime. |

## Polling behaviour

| Variable | Default | Description |
|---|---|---|
| `PLATFORM_API_WORKER_INTERVAL_MS` | `2000` | Base interval between polling ticks in milliseconds. A random jitter of 0–500 ms is added automatically. |
| `PLATFORM_API_WORKER_ONCE` | `false` | Set to `true` to drain the queue once and exit — useful for CI and one-shot jobs. |

## Identity and health

| Variable | Default | Description |
|---|---|---|
| `BATTLE_WORKER_ID` | `worker-<pid>` | Unique identifier for this worker instance. Set explicitly when running multiple pods so heartbeat monitoring can distinguish them. Example: `worker-0`. |
| `WORKER_HEARTBEAT_INTERVAL_MS` | `10000` | How often (ms) the worker writes a heartbeat row. Only active when `FEATURE_WORKER_HEALTH_MONITORING=true`. |
| `FEATURE_WORKER_HEALTH_MONITORING` | `false` | Set to `true` to enable `fn_worker_upsert_heartbeat` calls. Requires the heartbeat table to exist in your Supabase project. |

## Battle sub-worker

| Variable | Default | Description |
|---|---|---|
| `BATTLE_WORKER_MAX_RETRIES` | `3` | Maximum retry attempts before a battle job is moved to the dead-letter queue. |
| `CHAINABIT_EXECUTION_ENABLED` | `false` | Set to `true` to delegate battle execution to the Chainabit bridge instead of calling AI providers directly. Requires `CHAINABIT_API_URL` and `CHAINABIT_PARTNER_API_KEY`. |

## AI provider keys

The worker resolves AI provider keys in this order:
1. BYOK (per-run encrypted key stored in the database, decrypted via `fn_worker_decrypt_api_key`)
2. Local BYOK (ollama only — no key needed)
3. Platform key from environment (below)

Set the key for each provider you want the platform to support on its own funding source. If a key is absent, runs funded by the platform will fail for that provider; BYOK runs are unaffected.

| Variable | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI (GPT-4o, GPT-4, DALL-E, Sora) |
| `ANTHROPIC_API_KEY` | Anthropic (Claude 3.x, Claude 4.x) |
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` | Google (Gemini, Veo, Lyria) |
| `FAL_API_KEY` | fal.ai (Flux, SDXL, Stable Video, …) |
| `SUNO_API_KEY` | Suno (music generation) |
| `KLING_API_KEY` | Kling (video generation) |
| `OLLAMA_BASE_URL` | Ollama local models (default: `http://localhost:11434`) |

## Local development shortcut

Set `ECHO_PROVIDER=1` (or `ECHO_PROVIDER=true`) to use a mock echo provider that reflects the prompt back as the response without calling any real AI API. This lets you run the full execution pipeline locally without any provider keys.

```sh
ECHO_PROVIDER=1 pnpm nx serve worker
```

## Chainabit integration

Only required when `CHAINABIT_EXECUTION_ENABLED=true`.

| Variable | Description |
|---|---|
| `CHAINABIT_API_URL` | Chainabit API base URL. Production: `https://api.chainabit.com`. Local: `http://localhost:4000/api/v1`. |
| `CHAINABIT_PARTNER_API_KEY` | Partner API key issued by Chainabit. |

## Full example

```sh
# .env or process environment

# Required
SUPABASE_URL=https://xyzxyzxyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Sub-worker toggles
PLATFORM_API_BATTLE_WORKER_ENABLED=true
PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED=true
PLATFORM_API_TEAM_RUN_WORKER_ENABLED=true

# Polling
PLATFORM_API_WORKER_INTERVAL_MS=2000

# Identity
BATTLE_WORKER_ID=worker-0

# AI providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
FAL_API_KEY=...
```
