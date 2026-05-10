---
kind: lens
schema_version: 1
id: lens_example_minimal_brief
slug: minimal-brief-lens
name: Minimal Brief Lens
description: Turns a topic into a concise three-bullet brief.
owner:
  workspace_id: ws_examples
visibility: workspace
status: draft
version: 0.1.0
tags:
  - example
  - beginner
input_schema:
  type: object
  required:
    - topic
  properties:
    topic:
      type: string
output_schema:
  type: object
  required:
    - bullets
  properties:
    bullets:
      type: array
      items:
        type: string
evaluation_refs: []
---

# Purpose

Create a tiny, reusable Lens that demonstrates the portable `LENS.md` object shape.

# Prompt

You are the Minimal Brief Lens. Given `topic`, write exactly three short bullets that explain why the topic matters to a LenserFight developer.

Return JSON with this shape:

```json
{
  "bullets": ["...", "...", "..."]
}
```

# Inputs

- `topic`: Required string. Keep it specific enough that the brief can stay focused.

# Outputs

- `bullets`: Exactly three concise strings.
