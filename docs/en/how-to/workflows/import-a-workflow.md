---
title: Import a workflow
description: Turn an AI-generated JSON or YAML document into a working workflow, using any local or hosted model.
---

# Import a workflow

You can have any AI model design a workflow for you, then paste its answer straight into LenserFight. The instructions LenserFight gives the model are generated from the live node palette, so the model only ever suggests nodes that actually exist.

## Steps

1. Open **Create workflow** and choose **Start blank**.
2. Click **Workflow Instructions**. The full authoring brief is copied to your clipboard.
3. Paste it into any AI model — hosted or local — followed by what you want the workflow to do.
4. Copy the model's answer.
5. Back in the wizard, click **Import JSON / YAML**.
6. Paste the answer and click **Validate**.
7. Review the preview, then click **Create workflow**.

The workflow opens in the canvas, fully editable.

## What the preview tells you

Validation runs before anything is saved, so you can iterate on a bad document without leaving half-built workflows behind.

- **Fix before importing** — errors. Usually an invented node name, a connection pointing at a step that does not exist, or a missing trigger. The message names the closest real palette entries.
- **Applied automatically** — warnings. Things LenserFight corrected for you, such as stripping a markdown code fence, dropping a `visibility` field, or renumbering steps.

The step table shows exactly which palette node each step resolved to. If a step resolved to something you did not expect, fix the `nodeType` in the document and validate again.

## Formats

JSON and YAML both work and produce identical results. Leave the format on **Auto-detect** unless a document is being read the wrong way.

CSV is not offered for workflows — nested Lens definitions and the connection graph cannot survive flattening into rows.

## What happens to your Lenses

If the document defines Lenses, each one is either reused or created:

- A Lens you already own with a matching title **and** matching parameters is reused as-is.
- Anything else creates a new private Lens.

An import never edits a Lens you already own. If you own a same-titled Lens with different parameters, a separate one is created and you get a warning saying so.

## Schedules start paused

If the document includes a CRON schedule, it is created **paused**, even when the document asks for it to be active. Tick the checkbox in the preview to start it immediately, or activate it later from the Run panel.

## If an import fails

Nothing is left behind. If a write fails partway through, LenserFight removes exactly what that import created — the workflow and any Lenses it made. Lenses that were reused are never touched.

If cleanup itself fails, you will see a warning naming what to remove manually.

## Round-tripping

Exporting a workflow produces a document you can import again. Edit a workflow in the canvas, export it, and the result stays a valid importable document.

## See also

- [Workflow Import Protocol](../../reference/workflows/workflow-import-protocol.md) — the full field reference
- [Export a workflow](./export-a-workflow.md)
- [Workflow Node Catalog](../../reference/workflows/workflow-node-catalog.md)
