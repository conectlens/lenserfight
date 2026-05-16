# Automation CLI

The automation-first CLI surface is the local-file companion to LenserFight's canonical markdown objects.

## Core commands

| Command | Purpose |
|---|---|
| `lf validate <path>` | Validate file-first automation markdown objects |
| `lf import <path>` | Register validated markdown objects in the local registry |
| `lf export <kind> --template` | Generate a canonical object template |
| `lf export <kind> <id>` | Re-export an imported object by id |
| `lf workflow run <file>` | Simulate a `COLENS.MD` and emit reports |
| `lf tool test <file>` | Validate a `TOOL.md` contract |
| `lf evaluate <file>` | Validate and summarize an `EVALUATION.md` spec |
| `lf battle run <file>` | Simulate a `PRIVATE_BATTLE.md` spec |
| `lf team run ...` | Alias of team dispatch for automation-oriented wording |

## Typical local-first flow

```bash
lenserfight export agent --template --out ./LENSER.MD
lenserfight export workflow --template --out ./COLENS.MD
lenserfight validate .
lenserfight import .
lenserfight workflow run ./COLENS.MD
lenserfight battle run ./PRIVATE_BATTLE.md
```

## Notes

- `lf report` still refers to moderation reporting in the current CLI
- the new automation/report generation flow is emitted as `RUN_REPORT.md` artifacts from local simulations
- this is the file-first foundation, not the final hosted sync contract

## CRON scheduling (cloud and self-hosted)

Workflow schedules trigger autonomous agent runs on a CRON expression. The `lf schedule` command manages schedules; the `lf schedule health` command detects missed dispatches.

| Command | Purpose |
|---|---|
| `lf schedule list` | List all workflow schedules |
| `lf schedule create` | Create a new CRON schedule |
| `lf schedule pause/resume <id>` | Pause or resume a schedule |
| `lf schedule delete <id>` | Delete a schedule |
| `lf schedule history <id>` | Show the most recent dispatch summary |
| `lf schedule health` | Detect schedules that missed their dispatch window (exits 1 if any MISSED) |

### Self-hosted prerequisites

CRON scheduling requires `pg_cron` enabled in your Supabase project and the `dispatch-scheduled-workflows` job scheduled (see migrations). The web app Schedules UI is available whenever the database supports schedule RPCs.

### Health detection algorithm

`lf schedule health` infers the expected interval from the CRON expression (e.g., `0 * * * *` → 60 minutes) and flags a schedule as **MISSED** when:
- `last_run_at + 2 × interval < now`, or
- `next_run_at` is more than one interval in the past.

Inactive (paused) schedules are reported as **PAUSED** and do not trigger exit code 1.

## Related

- [CLI Hub](/en/reference/cli/index)
- [Markdown Object Formats](/en/reference/automation/markdown-objects)
- [Execution Reference](execution.md)
