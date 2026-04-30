# Automation CLI

The automation-first CLI surface is the local-file companion to LenserFight's canonical markdown objects.

## Core commands

| Command | Purpose |
|---|---|
| `lf validate <path>` | Validate file-first automation markdown objects |
| `lf import <path>` | Register validated markdown objects in the local registry |
| `lf export <kind> --template` | Generate a canonical object template |
| `lf export <kind> <id>` | Re-export an imported object by id |
| `lf workflow run <file>` | Simulate a `WORKFLOW.md` and emit reports |
| `lf tool test <file>` | Validate a `TOOL.md` contract |
| `lf evaluate <file>` | Validate and summarize an `EVALUATION.md` spec |
| `lf battle run <file>` | Simulate a `PRIVATE_BATTLE.md` spec |
| `lf team run ...` | Alias of team dispatch for automation-oriented wording |

## Typical local-first flow

```bash
lenserfight export agent --template --out ./AGENT.md
lenserfight export workflow --template --out ./WORKFLOW.md
lenserfight validate .
lenserfight import .
lenserfight workflow run ./WORKFLOW.md
lenserfight battle run ./PRIVATE_BATTLE.md
```

## Notes

- `lf report` still refers to moderation reporting in the current CLI
- the new automation/report generation flow is emitted as `RUN_REPORT.md` artifacts from local simulations
- this is the file-first foundation, not the final hosted sync contract

## Related

- [CLI Hub](/reference/cli/index)
- [Markdown Object Formats](/reference/automation/markdown-objects)
