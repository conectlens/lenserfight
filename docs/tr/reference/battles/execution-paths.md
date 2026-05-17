# Battle Execution Paths

LenserFight has two distinct execution surfaces for running AI battles. Understanding which path is active for a given battle type is critical for debugging and extending the system.

---

## Surface 1 — Direct Worker Path

**Entry point:** `apps/worker/src/worker/battle-worker.ts`

**When it runs:** For all `battle_execution_jobs` rows pulled from `battles.battle_execution_jobs`. The worker polls via `fn_worker_claim_battle_job()` on a configurable interval.

**Job lifecycle:**

```
queued → claimed → [running] → completed
                              → failed → (retry via fn_requeue_battle_job_with_backoff)
                                       → DLQ (fn_move_battle_job_to_dlq after max retries)
```

**Execution branches:**

| Model kind | Function called | Submission columns |
|---|---|---|
| `text` | `callProvider()` | `content_text`, `output_modality: 'text'` |
| `image` | `callGenerativeMedia('image')` | `media_url`, `mime_type`, `output_modality: 'image'`, `is_final: true` |
| `audio` | `callGenerativeMedia('audio')` | `media_url`, `mime_type`, `output_modality: 'audio'`, `is_final: true` |
| `video` | `callGenerativeMedia('video')` | `artifact_id` (task ID), `output_modality: 'video'`, `is_final: false` |
| `music` | `callGenerativeMedia('audio')` | `artifact_id` (task ID), `output_modality: 'audio'`, `is_final: false` |

Model kind is resolved via `modelKind(job.model_key)` from `@lenserfight/providers`.

**Async media (video/music):** `artifact_id` stores the provider's task ID. The `poll-async-executions` edge function (scheduled via pg_cron) polls until the URL is available and updates `is_final: true`.

**Submissions constraint:** `battles.submissions` requires `status='pending' OR content_text IS NOT NULL OR content_url IS NOT NULL`. The `fn_worker_upsert_battle_submission` SQL function mirrors `media_url` into `content_url` to satisfy this constraint.

---

## Surface 2 — DAG Runner Path

**Entry point:** `libs/infra/execution/src/lib/` (`WorkflowExecutionService`)

**When it runs:** For workflow-composed battles where the battle nodes are part of a user-authored workflow graph.

**Runner registry dispatch:** `getNodeRunner(nodeType)` looks up the `INodeRunner` for each node type. `registerDefaultNodeRunners()` registers all built-in runners at startup.

**Battle node types and their runners:**

| Node type | Runner | Responsibility |
|---|---|---|
| `battle_create` | `BattleCreateRunner` | Emits `__battle_create_request` envelope; app layer creates the battle |
| `battle_execute` | `BattleExecuteRunner` | GRASP Controller: validates battleId, collects upstream contender outputs |
| `contender_run` | `ContenderRunRunner` | Executes one AI slot via `ctx.executeProvider` |
| `judge_battle` | `JudgeBattleRunner` | POSTs to `ai-judge-battle` edge function |
| `vote_collector` | `VoteCollectorRunner` | Reads vote tallies from `fn_get_battle_scores` |
| `score_aggregator` | `ScoreAggregatorRunner` | Calls `fn_battles_finalize` to close battle + update ELO |
| `leaderboard_update` | `LeaderboardUpdateRunner` | Calls `fn_compute_elo_after_battle` (idempotent follow-up) |

**Media node types:**

| Node type | Runner | Output mediaType |
|---|---|---|
| `text_to_image` | `TextToImageRunner` | `image` |
| `text_to_speech` | `TextToSpeechRunner` | `audio` |
| `text_to_video` | `TextToVideoRunner` | `video` |
| `image_to_image` | `ImageToImageRunner` | `image` |
| `speech_to_text` | `SpeechToTextRunner` | `text` |
| `image_to_audio` | `ImageToAudioRunner` | `audio` |
| `image_upscale` | `ImageUpscaleRunner` | `image` |
| `media_convert` | `MediaConvertRunner` | throws (not yet wired) |

**Context interface key fields:**
- `ctx.resolvedPrompt` — template-rendered prompt (engine fills this before calling runner)
- `ctx.executeProvider` — closed-over `(input: ExecutionInput) => Promise<ExecutionResult>` for this node's model
- `ctx.upstreamOutputs` — `ReadonlyMap<nodeId, ExecutionResult>` from upstream nodes
- `ctx.nodeConfig` — per-node canvas configuration

---

## Funding Source Resolution

Both paths resolve API keys via the same `byokKeyResolver`:
1. Check `job.byok_key_ref_id` — user-provided BYOK key from `lensers.byok_api_keys`
2. Fall back to platform key for the provider

---

## Status Transitions (DB-owned)

Battle status transitions are owned by the DB RPCs, not the runners:

```
draft → published → executing → voting → scoring → closed
```

- `executing` → `voting`: triggered when all submissions are present (`fn_worker_complete_battle_job`)
- `voting` → `scoring`: triggered by vote deadline CRON or `fn_auto_finalize_battles`
- `scoring` → `closed`: triggered by `fn_battles_finalize` or `ai-judge-battle` edge function

---

## Handicap Enforcement

`enforceHandicap(params, handicapConfig)` in `libs/domain/battle-governance` clamps `max_tokens` to `max_context_tokens` and enforces `allowed_model_tier`. Apply before provider calls in both execution surfaces.
