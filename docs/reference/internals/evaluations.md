---
title: Evaluations
description: How to measure agent, workflow, lens, and team quality with versioned rubrics, repeatable test cases, baseline snapshots, and regression tracking.
---

# Evaluations

Evaluations make every agent-facing primitive measurable. An evaluation suite defines a set of test cases with expected outputs. Running the suite scores each case and produces an aggregate score that you can track over time, set a golden baseline on, and compare against future runs to catch regressions.

## Primitives

| Primitive | What it is |
|---|---|
| **Evaluation** | A named suite targeting a `lens`, `workflow`, `agent`, or `team`. Carries `scoring_rules` (JSONB) and a set of cases. |
| **Evaluation case** | A single input/expected pair with a `weight` and optional `tags`. Reusable across runs. |
| **Rubric** | A versioned list of scoring criteria: `{name, weight, threshold, operator}`. Rubrics are immutable — saving a new version bumps `version` and marks the prior one `is_current=false`. |
| **Evaluation run** | One execution of the suite. Scored by the runner against the active rubric. Records `status`, aggregate `score`, `started_at`, `completed_at`, and which `rubric_id` was active. |
| **Case result** | Per-case outcome: `score`, `output`, `error`, `passed`. `passed` is set by the runner when a rubric's threshold/operator is evaluated. |
| **Baseline** | A single "golden run" snapshot per evaluation. Shows a dashed reference line on the regression chart; completed runs display a delta vs. baseline. |

## Creating an evaluation

Open **Evaluations** in the agent workspace → click **New evaluation**.

- **Simple mode** — choose a rubric preset (`binary_pass`, `scale_1–5`, `custom`) and add cases with a form.
- **Advanced mode** — paste raw JSON for `scoring_rules` and `cases`.

After creating the evaluation, click **Cases** to add, edit, or delete individual test cases.

## Building a rubric

Expand any evaluation → open the **Rubric** panel at the bottom.

Each criterion row has:
- **Name** — human-readable label (e.g. `factual_accuracy`)
- **Operator** — `>=`, `<=`, or `==`
- **Threshold** — numeric score boundary (0–1)
- **Weight** — relative importance when computing the aggregate

Click **Save as new version** to publish. The runner uses the rubric that was `is_current` at the moment the run was queued.

## Running evaluations

### Manual trigger

Click **Run** on any evaluation card. This queues an `evaluation_run` with `status='queued'`. The runner backend picks it up and populates case results. The UI polls every 5 seconds and updates when results arrive.

### Post-workflow trigger

Any time a workflow run completes with `status='completed'`, `useTeamRunDispatch` calls `fn_trigger_post_run_evaluations(workflow_id, team_run_id)`. This RPC finds all evaluations whose `target_type='workflow'` and `target_id` matches the workflow, and queues a run for each.

This means every successful workflow execution is automatically evaluated — no manual intervention needed.

### Evaluator agent role

A workflow assignment with `assignee_kind='evaluator'` designates an AI agent as the evaluator for a workflow. When that agent's workspace completes a workflow run, it is the evaluation agent that acts rather than a standard executor. Set this in the **Workflow Assignments** drawer by choosing **evaluator** from the assignee kind selector.

## Baseline snapshots

After a run completes, click **Baseline** next to it in the run history. This sets it as the golden reference. Subsequent runs show a delta badge:

- `+0.045` in green — improved over baseline
- `−0.012` in red — regressed from baseline

The baseline score also renders as a dashed amber reference line on the regression chart.

## Regression history chart

When an evaluation has two or more scored runs, the **Score history** chart appears above the run list. It plots `score` over time as a line chart with data points. The amber dashed line marks the baseline if one is set.

Use this chart to identify:
- Regressions after a model or prompt change
- Improvements after rubric refinement
- Variance in scoring across otherwise identical runs

## Inspecting failures

On any completed run row, click **Failures** to open the **Failed case drawer**. It shows every case where `passed=false` (or `score < 1` when `passed` is null), with:

- Full **input** JSON (collapsible)
- Full **expected** JSON (collapsible)
- Actual **output** JSON (collapsible)
- **Error** text if the runner threw

Use this to diagnose which specific cases are failing and why before editing the prompt or expected output.

## DB schema reference

### `agents.evaluations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `owner_lenser_id` | uuid | Profile owning this suite |
| `ai_lenser_id` | uuid | Associated agent (nullable) |
| `target_type` | text | `lens`, `workflow`, `agent`, `team` |
| `target_id` | uuid | ID of the target entity |
| `name` | text | Display name |
| `scoring_rules` | jsonb | Legacy free-form rules; use rubrics for structured criteria |
| `created_at` | timestamptz | |

### `agents.evaluation_rubrics`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `evaluation_id` | uuid | FK → evaluations |
| `version` | integer | Monotonically increasing per evaluation |
| `criteria` | jsonb | Array of `{name, weight, threshold, operator}` |
| `is_current` | boolean | Only one rubric per evaluation is current at a time |
| `created_at` | timestamptz | |

### `agents.evaluation_baselines`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `evaluation_id` | uuid | FK → evaluations (UNIQUE — one baseline per eval) |
| `run_id` | uuid | FK → evaluation_runs |
| `score` | numeric | Captured score at the time baseline was set |
| `set_at` | timestamptz | |
| `set_by` | uuid | FK → profiles |

### `agents.evaluation_runs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `evaluation_id` | uuid | FK → evaluations |
| `rubric_id` | uuid | Rubric active at queue time (nullable) |
| `status` | text | `queued`, `running`, `completed`, `failed`, `cancelled` |
| `score` | numeric | Aggregate score 0–1 |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |

### `agents.evaluation_case_results`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `evaluation_run_id` | uuid | FK → evaluation_runs |
| `case_id` | uuid | FK → evaluation_cases |
| `score` | numeric | Per-case score |
| `output` | jsonb | Actual model output |
| `error` | text | Error message if case failed to execute |
| `passed` | boolean | Set by runner based on rubric threshold/operator |

## RPC reference

### `fn_run_evaluation(p_evaluation_id uuid, p_model_id uuid DEFAULT NULL)`

Queues a new `evaluation_run` with `status='queued'`. Authorization: caller must own the evaluation or manage its AI lenser. Returns the new run UUID.

```sql
SELECT fn_run_evaluation('eval-uuid', NULL);
```

### `fn_trigger_post_run_evaluations(p_workflow_id uuid, p_team_run_id uuid)`

Finds all evaluations targeting `p_workflow_id` (`target_type='workflow'`) and queues a run for each via `fn_run_evaluation`. Called by `useTeamRunDispatch` after a workflow run completes. Fire-and-forget on the client side.

```sql
SELECT agents.fn_trigger_post_run_evaluations('workflow-uuid', 'team-run-uuid');
```
