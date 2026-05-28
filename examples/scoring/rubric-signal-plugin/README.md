# Rubric Signal Scoring Plugin

Demonstrates a deterministic scoring plugin that emits simple numeric signals from a battle submission.

Use this pattern when you need lightweight, pure scoring signals that can be aggregated or inspected alongside human/AI judging.

## Files Included

- `src/index.mjs` — plugin-shaped object with `id`, `metadata`, and `score`.
- `src/demo.mjs` — local demo submission and printed scoring result.

## Setup

No install step is required beyond Node 22.

## Run Command

```bash
node examples/scoring/rubric-signal-plugin/src/demo.mjs
```

## Expected Output

The demo prints the plugin ID, metadata, and an `ok: true` result containing `word_count`, `required_term_hits`, and `rubric_hit_ratio`.

## Configuration Notes

The plugin is intentionally pure: no network calls, no database access, and no secrets. This matches the repository's `ScoringPluginV1` guidance.

## Tutorial

Follow [Rubric Signal Plugin Tutorial](../../../docs/en/tutorials/developer-examples/rubric-signal-plugin.md).
