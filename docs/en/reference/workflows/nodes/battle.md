---
title: Battle / Arena Nodes | Workflow Node Reference
description: Reference for all Battle and Arena nodes in LenserFight Workflow Studio — creating, executing, judging, scoring, and ranking battles.
---

# Battle / Arena Nodes

Battle nodes automate the full LenserFight battle lifecycle — from creating a battle definition through executing contenders, collecting votes, aggregating scores, and updating leaderboards.

| Node | Type | Output |
|------|------|--------|
| [Battle Create](#battle-create) | `battle_create` | `json` |
| [Battle Execute](#battle-execute) | `battle_execute` | `battle_result` |
| [Contender Run](#contender-run) | `contender_run` | `lens_result` |
| [Judge Battle](#judge-battle) | `judge_battle` | `battle_result` |
| [Vote Collector](#vote-collector) | `vote_collector` | `json` |
| [Score Aggregator](#score-aggregator) | `score_aggregator` | `battle_result` |
| [Leaderboard Update](#leaderboard-update) | `leaderboard_update` | `json` |

---

## Battle Create {#battle-create}

**Type:** `battle_create` · **Category:** Battle / Arena

Create a battle definition from a prompt and contender list. Returns a `battleId` and draft status.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `json` | `json` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `battleId` | `string` | Battle identifier or mapping. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `visibility` | `select` | `workspace` | `private` · `workspace` · `public` |

### Example

```json
{ "title": "RAG answer showdown", "visibility": "workspace" }
```

**Expected output:** `{ "battleId": "battle_123", "status": "draft" }`

**Downstream:** → `battle_execute`

### Related Nodes

[Battle Execute](#battle-execute) · [Form / Input Trigger](./trigger#form-input-trigger)

---

## Battle Execute {#battle-execute}

**Type:** `battle_execute` · **Category:** Battle / Arena

Execute contenders and apply a judge strategy for a battle. The central orchestration node for automated AI battles.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `prompt` | `text` | Yes — battle prompt |
| `contenders` | `array` | Yes — contender definitions |

### Outputs

| Name | Type | Shape |
|------|------|-------|
| `battleResult` | `battle_result` | `{ battleId: text, winner: text, scores: json }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `contenders` | `json` | Contender configs: `[{ id, lensId }]` or `[{ id, agentId }]`. |
| `judgeStrategy` | `select` | `single_judge` · `panel` · `vote` |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `promptSource` | `string` | — | Path to the battle prompt. |
| `fundingSource` | `select` | `platform_credit` | `platform_credit` · `user_byok_cloud` · `user_byok_local` |
| `resultVisibility` | `select` | `workspace` | `private` · `workspace` · `public` |

### Example

```json
{
  "contenders": [
    { "id": "concise", "lensId": "lens_concise_answer" },
    { "id": "sourced", "lensId": "lens_sourced_answer" }
  ],
  "promptSource": "$.prompt",
  "judgeStrategy": "panel",
  "fundingSource": "platform_credit",
  "resultVisibility": "workspace",
  "retry": { "attempts": 2, "backoffMs": 2000 }
}
```

**Scenario:** Run two RAG-answer contenders and produce a judged winner.

**Expected output:** `{ "battleId": "battle_123", "winner": "sourced", "scores": { "sourced": 94, "concise": 78 } }`

**Downstream:** → `leaderboard_update` with `{ "battleId": "$.battleId", "winner": "$.winner" }`

### Valid Connections

→ `leaderboard_update`, `score_aggregator`, `slack_notify`, `judge_battle`

### Related Nodes

[Battle Create](#battle-create) · [Judge Battle](#judge-battle) · [Judge / Eval](./ai-primitives#judge-evaluator) · [Vote Collector](#vote-collector)

---

## Contender Run {#contender-run}

**Type:** `contender_run` · **Category:** Battle / Arena

Run one battle contender against a prompt. Use when you want fine-grained control over individual contender execution before aggregating.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `contenderId` | `string` | Contender identifier. |

### Example

```json
{
  "contenderId": "sourced",
  "lensId": "lens_sourced_answer",
  "model_id": "openai:gpt-4.1-mini"
}
```

**Expected output:** `{ "contenderId": "sourced", "output": "Answer with citations..." }`

**Downstream:** → `judge_battle`

---

## Judge Battle {#judge-battle}

**Type:** `judge_battle` · **Category:** Battle / Arena

Judge contender outputs and emit a battle result with winner and scores.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `rubric` | `string` | Evaluation rubric. |

### Example

```json
{
  "rubric": "Prefer correctness and source coverage.",
  "judgeModel": "anthropic:claude-3-7-sonnet"
}
```

**Expected output:** `{ "winner": "sourced", "scores": { "sourced": 94, "concise": 78 } }`

**Downstream:** → `score_aggregator`

### Related Nodes

[Battle Execute](#battle-execute) · [Vote Collector](#vote-collector) · [Judge / Eval](./ai-primitives#judge-evaluator)

---

## Vote Collector {#vote-collector}

**Type:** `vote_collector` · **Category:** Battle / Arena

Collect human or automated votes for a battle and emit aggregated vote data.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `battleId` | `string` | Battle id or mapping (e.g. `$.battleId`). |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `closeAfterVotes` | `number` | Automatically close voting after N votes. |

### Example

```json
{ "battleId": "$.battleId", "closeAfterVotes": 7 }
```

**Expected output:** `{ "votes": [{ "voter": "u1", "contenderId": "sourced" }] }`

**Downstream:** → `score_aggregator`

---

## Score Aggregator {#score-aggregator}

**Type:** `score_aggregator` · **Category:** Battle / Arena

Aggregate judge scores and votes into final rankings using a weighted strategy.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `aggregation` | `string` | Aggregation strategy (e.g. `weighted_average`). |

### Example

```json
{
  "aggregation": "weighted_average",
  "weights": { "judge": 0.8, "vote": 0.2 }
}
```

**Expected output:** `{ "winner": "sourced", "finalScore": 91.6 }`

**Downstream:** → `leaderboard_update`

### Related Nodes

[Judge Battle](#judge-battle) · [Vote Collector](#vote-collector) · [Leaderboard Update](#leaderboard-update)

---

## Leaderboard Update {#leaderboard-update}

**Type:** `leaderboard_update` · **Category:** Battle / Arena

Write battle results to a leaderboard. The terminal node of most battle automation pipelines.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `battleResult` | `battle_result` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `leaderboardId` | `string` | Leaderboard identifier. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `scorePath` | `string` | `$.finalScore` | — |
| `visibility` | `select` | `workspace` | `private` · `workspace` · `public` |

### Example

```json
{
  "leaderboardId": "arena_weekly",
  "scorePath": "$.finalScore",
  "visibility": "workspace"
}
```

**Expected output:** `{ "updated": true, "rank": 1 }`

**Downstream:** → `slack_notify`

### Valid Connections

→ `slack_notify`, `discord_notify`, `email_send`, `logger`

### Invalid Connections

✗ Cannot receive `text` or `json` — requires a `battle_result` typed input from `battle_execute`, `judge_battle`, or `score_aggregator`.

### Related Nodes

[Score Aggregator](#score-aggregator) · [Battle Execute](#battle-execute) · [Slack Notify](./communication#slack-notify)

---

**See also:** [Node Catalog Index](./) · [AI Primitive Nodes](./ai-primitives) · [Workflow Studio](/en/how-to/agents/workspace/workflows) · [Battle concepts](/en/explanation/battles/automation)
