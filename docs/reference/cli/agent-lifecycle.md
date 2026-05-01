---
title: "Agent Lifecycle Commands (Phase 8)"
description: "CLI reference for kill switch, pause/resume, run control, budget, dark launch, and policy log commands introduced in Phase 8."
---

# Agent Lifecycle Commands (Phase 8)

Phase 8 adds a set of operator-facing lifecycle commands. All commands target an AI lenser by its handle (e.g. `@my-lenser`).

---

## Command overview

| Command | Description | RPC called |
|---------|-------------|-----------|
| `lf kill-switch on <handle>` | Activate the kill switch — denies all new runs | `fn_set_kill_switch` |
| `lf kill-switch off <handle>` | Deactivate the kill switch | `fn_set_kill_switch` |
| `lf kill-switch status <handle>` | Show current kill switch state | `fn_evaluate_pre_run_policy` |
| `lf runner pause <handle>` | Pause new run dispatch | `fn_set_runner_paused` |
| `lf runner resume <handle>` | Resume run dispatch | `fn_set_runner_paused` |
| `lf runner status <handle>` | Show runner state and active run count | — |
| `lf run cancel <run-id>` | Cancel a running or queued run | `fn_cancel_team_run` |
| `lf run report <run-id>` | Print the run report for a terminal run | — |
| `lf run incidents <run-id>` | List incidents for a run | — |
| `lf run policy-check <handle>` | Run a pre-run policy check and show verdict | `fn_evaluate_pre_run_policy` |
| `lf budget set <handle>` | Set or update the budget ceiling | `fn_set_workspace_setting` |
| `lf budget status <handle>` | Show current spend and ceiling | — |
| `lf dark-launch enable <handle>` | Enable dark launch for a workflow | `fn_set_dark_launch` |
| `lf dark-launch disable <handle>` | Disable dark launch | `fn_set_dark_launch` |
| `lf dark-launch status <handle>` | Show dark launch percentage and included workflow IDs | — |
| `lf policy log <handle>` | Stream recent policy evaluation rows | — |
| `lf policy stats <handle>` | Aggregate policy verdict counts for a period | — |

---

## Kill Switch

### Usage

```bash
lf kill-switch on|off|status <handle>
```

### Arguments

| Arg | Description |
|-----|-------------|
| `on` | Activate the kill switch |
| `off` | Deactivate the kill switch |
| `status` | Print current state |
| `<handle>` | AI lenser handle (e.g. `@my-lenser`) |

### Flags

| Flag | Description |
|------|-------------|
| `--reason <text>` | Optional reason stored in `policy_evaluations.reason` |
| `--workspace <id>` | Target a specific workspace (defaults to active session workspace) |

### Example

```bash
lf kill-switch on @my-lenser --reason "suspected prompt injection"
```

```
Kill switch activated for @my-lenser
  reason: suspected prompt injection
  active runs will be marked killed on next heartbeat
```

```bash
lf kill-switch status @my-lenser
```

```
Kill switch status for @my-lenser
  state:    ACTIVE
  set at:   2026-05-01T14:22:00Z
  reason:   suspected prompt injection
```

**RPC called:** `fn_set_kill_switch(p_ai_lenser_id, p_active, p_reason)`

---

## Pause / Resume

### Usage

```bash
lf runner pause|resume|status <handle>
```

### Arguments

| Arg | Description |
|-----|-------------|
| `pause` | Pause new run dispatch; active runs complete |
| `resume` | Re-enable dispatch |
| `status` | Print runner state and active run count |
| `<handle>` | AI lenser handle |

### Flags

| Flag | Description |
|------|-------------|
| `--workspace <id>` | Target workspace |

### Example

```bash
lf runner pause @my-lenser
```

```
Runner paused for @my-lenser
  active runs (2) will complete normally
  new runs will be denied with verdict: pause
```

```bash
lf runner status @my-lenser
```

```
Runner status for @my-lenser
  state:        PAUSED
  active runs:  2
  queued runs:  0
```

**RPC called:** `fn_set_runner_paused(p_ai_lenser_id, p_paused)`

---

## Run Control

### Usage

```bash
lf run cancel|report|incidents|policy-check <id-or-handle>
```

### `lf run cancel`

Cancel an active or queued run:

```bash
lf run cancel run_abc123
```

```
Run run_abc123 cancelled
  a run_report will be created with outcome: cancelled
```

**RPC called:** `fn_cancel_team_run(p_team_run_id)`

### `lf run report`

Print the run report for a terminal run:

```bash
lf run report run_abc123
```

```
Run Report  run_abc123
──────────────────────────────────
  outcome             success
  steps               12
  tool invocations    3
  memory writes       2
  cost estimate       $0.04
  duration            4 231 ms
  summary             Completed sentiment analysis across 10 inputs.
```

### `lf run incidents`

List incidents attached to a run report:

```bash
lf run incidents run_xyz789
```

```
Incidents for run_xyz789
  [high]    budget_overrun     Cumulative cost $12.80 exceeded ceiling $10.00
  [medium]  tool_timeout       Tool search_web timed out after 30s on step 4
```

### `lf run policy-check`

Run a pre-run policy check without dispatching:

```bash
lf run policy-check @my-lenser --workflow wf_abc123
```

```
Policy check for @my-lenser, workflow wf_abc123
  ✓ kill_switch    not active
  ✓ runner_pause   not paused
  ✓ budget_ceiling $12.40 / $100.00
  ✓ parallel_runs  2 / 5 active
  ✓ dark_launch    not configured
─────────────────────────────────────
  verdict: allow
```

**RPC called:** `fn_evaluate_pre_run_policy(p_ai_lenser_id, p_workflow_id, p_context)`

---

## Budget

### Usage

```bash
lf budget set|status <handle>
```

### `lf budget set`

```bash
lf budget set @my-lenser --ceiling 50.00 --period monthly
```

```
Budget ceiling updated for @my-lenser
  ceiling:  $50.00
  period:   monthly
  current spend this period: $12.40
```

### Flags

| Flag | Description |
|------|-------------|
| `--ceiling <usd>` | Maximum spend in USD before runs are denied |
| `--period <monthly\|daily\|rolling-30d>` | Budget reset window |

### `lf budget status`

```bash
lf budget status @my-lenser
```

```
Budget status for @my-lenser
  ceiling:    $50.00 (monthly)
  spent:      $12.40
  remaining:  $37.60
  resets at:  2026-06-01T00:00:00Z
```

**RPC called:** `fn_set_workspace_setting(p_workspace_id, p_key, p_value)`

---

## Dark Launch

### Usage

```bash
lf dark-launch enable|disable|status <handle>
```

### `lf dark-launch enable`

```bash
lf dark-launch enable @my-lenser --workflow wf_abc123 --percentage 10
```

```
Dark launch enabled for workflow wf_abc123
  percentage:  10%
  routing:     md5(workflow_id) % 100 < 10
  in window:   deterministic (same result on every check)
```

### `lf dark-launch disable`

```bash
lf dark-launch disable @my-lenser --workflow wf_abc123
```

```
Dark launch disabled for workflow wf_abc123
  all runs for this workflow will now proceed normally
```

### `lf dark-launch status`

```bash
lf dark-launch status @my-lenser
```

```
Dark launch status for @my-lenser
  workflow wf_abc123   10%  ACTIVE
  workflow wf_def456   50%  ACTIVE
```

### Flags

| Flag | Description |
|------|-------------|
| `--workflow <id>` | Target workflow ID |
| `--percentage <0-100>` | Percentage of runs to allow through |

**RPC called:** `fn_set_dark_launch(p_ai_lenser_id, p_workflow_id, p_percentage)`

---

## Policy Log

### Usage

```bash
lf policy log|stats <handle>
```

### `lf policy log`

Stream recent policy evaluation rows (most recent first):

```bash
lf policy log @my-lenser --limit 5
```

```
Policy evaluations for @my-lenser (last 5)
  2026-05-01 14:22:01  pre_run               allow               –
  2026-05-01 14:21:44  pre_run               deny                kill_switch_active
  2026-05-01 14:18:03  pre_tool_invocation   allow               –
  2026-05-01 14:17:55  pre_run               allow               –
  2026-05-01 14:10:12  pre_run               deny                budget_ceiling_exceeded
```

### Flags for `lf policy log`

| Flag | Description |
|------|-------------|
| `--limit <n>` | Number of rows to return (default 20) |
| `--since <ISO date>` | Only show evaluations after this timestamp |
| `--verdict <verdict>` | Filter by verdict (`allow`, `deny`, `pause`, `require_approval`) |

### `lf policy stats`

Aggregate verdict counts for a time window:

```bash
lf policy stats @my-lenser --period 7d
```

```
Policy stats for @my-lenser (last 7 days)
  allow              142
  deny                 8   (budget_ceiling_exceeded: 5, kill_switch_active: 3)
  pause                0
  require_approval     2
  ─────────────────────
  total              152
```

### Flags for `lf policy stats`

| Flag | Description |
|------|-------------|
| `--period <1d\|7d\|30d>` | Aggregation window (default `7d`) |

---

## Related

- [Autonomous Agent OS](/explanation/agents/autonomous-agent-os) — governance controls overview
- [Policy Engine](/reference/platform-api/policy-engine) — RPC spec and verdict definitions
- [Run Reports & Incidents](/reference/platform-api/run-reports) — post-run artifact reference
- [Using the Kill Switch](/how-to/kill-switch) — step-by-step operator guide
- [Dark Launch Rollout](/how-to/dark-launch) — ramp procedure
