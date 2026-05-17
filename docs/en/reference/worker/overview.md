# Background Worker

The `apps/worker` application is a long-running Node.js process that handles all asynchronous, compute-heavy, and event-driven work that cannot run inside Supabase Edge Functions due to AI inference latency, persistent connection requirements, or execution time limits.

It connects directly to Supabase using the service-role key and processes jobs by polling database queues or subscribing to Realtime events.

## Why a separate worker?

Supabase Edge Functions have a hard wall-clock limit of **150 seconds per invocation** and cannot hold open connections between invocations. AI provider calls (OpenAI, Anthropic, Google, fal.ai) can take 30–120 seconds for complex prompts and media generation. A persistent poller with jitter is a better fit than per-tick Edge Function invocations for this workload.

| Concern | Supabase Edge Functions | Worker (`apps/worker`) |
|---|---|---|
| AI inference (30–120 s) | Timeout risk | Correct tool |
| Persistent Realtime subscriptions | Not possible | Supported |
| Polling with backoff/jitter | Not practical | Built-in |
| Short bounded tasks (~100 ms) | Correct tool | Works, but overkill |

## Sub-workers

The worker boots a single Node.js process that runs all of the following concurrently.

### Execution run queue

**Source:** `src/worker/main.ts` — `processNextQueuedRun`

Polls `fn_worker_claim_queued_run`. When a lens execution run is queued (user runs a Lens or workflow triggers a Lens node), this sub-worker claims it, resolves the API key (platform key or BYOK), renders the Liquid prompt template via `fn_worker_render_template`, calls the AI provider, and writes the result back via `fn_worker_complete_execution_run` + `fn_worker_persist_execution_artifacts`.

### Battle job processor

**Source:** `src/worker/battle-worker.ts` — `processNextBattleJob`

Polls `fn_worker_claim_battle_job`. Executes AI vs AI battle submissions. Supports personality/system prompts for AI agent contenders, exponential-backoff retry (up to `BATTLE_WORKER_MAX_RETRIES`), dead-letter queue on exhaustion, and optional delegation to the Chainabit execution bridge (`CHAINABIT_EXECUTION_ENABLED=true`).

### Scheduled workflow processor

**Source:** `src/worker/scheduled-workflow-worker.ts` — `processNextScheduledWorkflow`

Polls `fn_dispatch_scheduled_workflows`. Runs workflows triggered by cron schedules or time-based automation rules. Handles the full workflow graph including Lens nodes, communication nodes (email, Slack, Discord), and storage nodes.

### Team run processor

**Source:** `src/worker/team-run-worker.ts` — `processNextTeamRun`

Processes agent team run delegation requests. Each team run can involve multiple AI agents taking turns or working in parallel on a shared task.

### Vote anomaly detector

**Source:** `src/worker/vote-anomaly-worker.ts` — `startVoteAnomalyWorker`

Holds an open Supabase Realtime subscription on the votes table. Detects anomalous voting patterns in real time (burst voting, same-IP clusters, timing anomalies) and triggers moderation actions.

### Battle auto-promote poller

**Source:** `src/worker/battle-auto-promote-worker.ts` — `startBattleAutoPromoteWorker`

Short-polling loop that moves battles from `pending_promotion` to `active` once their scheduled promotion time passes. Equivalent to a pg_cron job but runs inside the worker process.

### Webhook drain

**Source:** `src/worker/webhook-drain-worker.ts` — `startWebhookDrainWorker`

Drains the `webhook_outbox` table. Delivers outbound webhook payloads to registered endpoints with retries and exponential backoff. Called via `fn_dispatch_webhook_outbox`.

### Workflow event dispatcher

**Source:** `src/worker/workflow-event-dispatcher.ts` — `startWorkflowEventDispatcher`

Publishes workflow lifecycle events (started, node completed, failed, finished) to Supabase Realtime channels so the web UI can update live without polling.

### Worker heartbeat

**Source:** `src/worker/main.ts` — `emitHeartbeat`

Emits a heartbeat every `WORKER_HEARTBEAT_INTERVAL_MS` milliseconds to `fn_worker_upsert_heartbeat` when `FEATURE_WORKER_HEALTH_MONITORING=true`. Enables ops tooling to detect dead workers.

## Architecture position

```
Browser / CLI / Mobile
        │
        ▼
   Supabase (PostgREST + Auth + Realtime + Storage)
        │
   Database queues (execution.queued_runs, battles.jobs, webhook_outbox, …)
        │
        ▼
   apps/worker  ──► AI Providers (OpenAI, Anthropic, Google, fal, …)
                ──► Chainabit (optional battle execution bridge)
```

The worker never exposes an HTTP server. All inbound work arrives via database rows; all outbound results are written back to the database or Supabase Storage.

## Scaling

Run multiple worker instances against the same Supabase project. Each sub-worker that polls uses `FOR UPDATE SKIP LOCKED` semantics (via Supabase RPCs) to prevent double-processing. The jitter added to the polling interval (`±500 ms`) prevents thundering-herd when pods are restarted simultaneously.

Set `BATTLE_WORKER_ID` to a unique string per instance (e.g. `worker-0`, `worker-1`) so heartbeat monitoring can distinguish pods.

## Relation to Supabase CRON (pg_cron)

Some short-lived tasks (battle auto-promote, webhook drain) could alternatively run as pg_cron jobs. They are kept inside the worker process for now because:

- They share the same Supabase connection pool and logging pipeline.
- They benefit from the in-process retry and backoff logic.
- Migration to Edge Function + pg_cron is straightforward if the worker is ever removed.

## Further reading

- [Environment variables](/en/reference/worker/environment-variables) — full variable reference
- [Running the worker](/en/how-to/operations/running-the-worker) — local dev, Docker, PM2, Railway
