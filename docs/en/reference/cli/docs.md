---
title: lf docs
description: Open or list LenserFight documentation directly from the CLI.
---

# `lf docs`

Open the LenserFight documentation in your browser or list available topic shortcuts.

## Subcommands

| Subcommand | Description |
|---|---|
| [`open`](#lf-docs-open) | Open a documentation topic in the browser |
| [`list`](#lf-docs-list) | List all available topic shortcuts |

---

## `lf docs open`

Open a documentation topic in the default browser.

```bash
lf docs open [topic]
```

### Arguments

| Argument | Required | Description |
|---|---|---|
| `topic` | no | Topic shortcut or doc path (defaults to CLI index) |

### Topic shortcuts

| Shortcut | Opens |
|---|---|
| `cli` | CLI reference index |
| `doctor` | Doctor command reference |
| `workflow` | Workflow command reference |
| `battle` | Battle command reference |
| `gateway` | Gateway command reference |
| `lenser` | Lenser command reference |
| `spec` | Spec governance reference |
| `examples` | CLI examples reference |
| `env` | Environment variables reference |
| `completion` | Shell completion guide |
| `update` | Update command reference |
| `getting-started` | Quick start guide |
| `install` | Installation guide |
| `auth` | Authentication guide |
| `local` | Local development setup |
| `ollama` | Ollama integration guide |
| `byok` | Bring Your Own Key guide |
| `troubleshoot` | Troubleshooting guide |

### Examples

```bash
# Open CLI reference index
lf docs open

# Open specific topic
lf docs open workflow
lf docs open getting-started
lf docs open troubleshoot

# Open arbitrary doc path
lf docs open /reference/internals/workflow-execution
```

---

## `lf docs list`

List all available topic shortcuts with their full URLs.

```bash
lf docs list
```
