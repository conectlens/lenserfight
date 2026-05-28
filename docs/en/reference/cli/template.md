---
title: lf template
description: "Manage battle templates: create, list, view, delete, apply, recurrence."
---

<!-- AUTO-GEN-START -->

# `lf template`

Manage battle templates: create, list, view, delete, apply, recurrence.

## `lf template delete`

Delete a template.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Template UUID |

## `lf template set-recurrence`

Set a recurrence rule on a template so battles are created automatically.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<id>` | positional | yes | Template UUID |
| `--recurrence` | string | yes | iCal RRULE (e.g. FREQ=DAILY, FREQ=WEEKLY) |
| `--starts-at` | string | no | ISO timestamp for first run (default: now) |
| `--auto-start-delay-hours` | string | no | Hours after template fires before battle execution_starts_at |

## `lf template list-recurring`

List all templates with a recurrence rule.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--json` | boolean | no | Output as JSON |

<!-- AUTO-GEN-END -->
