---
title: Rubric Signal Plugin Tutorial
description: Run a deterministic scoring plugin that emits numeric signals from a battle submission.
---

# Rubric Signal Plugin Tutorial

## Purpose

Learn how LenserFight scoring plugins turn submission text into deterministic numeric signals.

## Concepts Covered

Scoring, scoring plugin, `SubmissionView`, `ScoringResult`, result aggregation, failure handling.

## What You Will Build

You will run [`examples/scoring/rubric-signal-plugin`](../../../examples/scoring/rubric-signal-plugin/README.md), a local plugin-shaped module with `id`, `metadata`, and `score`.

## Prerequisites

- Node 22.

## File Structure

```text
examples/scoring/rubric-signal-plugin/
  src/
    index.mjs
    demo.mjs
  README.md
```

## Step-by-Step Walkthrough

1. Open `src/index.mjs`.
2. Inspect `REQUIRED_TERMS`.
3. Inspect the `score(submission)` method.
4. Notice the empty-content failure result.
5. Run the demo.

## How to Run the Example

```bash
node examples/scoring/rubric-signal-plugin/src/demo.mjs
```

## Expected Output

The script prints plugin metadata and an `ok: true` result similar to:

```text
signals: { word_count: 18, required_term_hits: 3, rubric_hit_ratio: 1 }
```

Exact word count may change if you edit the demo submission.

## How the Example Works Internally

The plugin treats the submission as a pure input value. It counts words, checks required rubric terms, and returns numeric signals. It performs no network or database calls.

## Common Errors and Troubleshooting

- `ok: false`: the submission text is empty or null.
- A high signal is not a final verdict; it is a scoring input that still needs interpretation.
- Keep signals numeric so they can be aggregated consistently.

## Suggested Modifications

- Add a `max_word_count` signal.
- Make required terms configurable in a factory option.
- Add a demo for a failed empty submission.

## Example Folder

[`examples/scoring/rubric-signal-plugin`](../../../examples/scoring/rubric-signal-plugin/README.md)
