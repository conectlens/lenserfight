---
title: Judge Evaluator
description: Uses an AI judge to score and rank battle contender outputs.
---

# Judge Evaluator

## Overview

The Judge Evaluator node assembles a structured evaluation prompt from the text outputs of upstream nodes and emits it for consumption by a downstream Lens node that performs the actual AI judging. It does not call an LLM itself and requires no AI provider credentials. Use it to compare two contender outputs head-to-head (`pairwise` mode) or rank any number of entries simultaneously (`absolute` mode); wire the output into a `lens_execute` or `judge_battle` node to obtain scored verdicts. If no upstream outputs are available when the node executes, it emits an error payload on the `output` port rather than failing the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `rubric` | string | No | Free-text evaluation criteria injected verbatim into the judge prompt. Defaults to 'Evaluate quality, relevance, and clarity.' if omitted. Write self-contained criteria — the downstream Lens receives this text with no additional context. |
| `comparisonMode` | enum ("pairwise", "absolute") | No | Controls how many upstream outputs are included. 'pairwise' (default) uses the first two; 'absolute' includes all upstream outputs. Use 'absolute' for leaderboard-style ranking across more than two contenders. |
| `sourceNodeIds` | string[] | No | Explicit list of upstream node IDs whose outputs should be evaluated. When set, overrides the automatic selection performed by comparisonMode. Useful when the workflow graph has more upstream nodes than should be included in the evaluation. |
| `maxScore` | number | No | Upper bound of the score range the downstream judge should use (default 10, capped at 100). The value is embedded in the prompt instruction ('Score each entry from 0 to N') and exposed in the output data for downstream nodes to use during score normalisation. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Optional. Accepts upstream node outputs keyed by node ID. If absent, the node reads directly from the workflow execution context's upstream output map. A data-only upstream (no text field) is serialised to JSON and included in the prompt. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains text (the fully assembled judge prompt, ready to pass to a Lens node) and data with keys: __judge_evaluation (boolean sentinel), rubric, comparisonMode, maxScore, entryCount, and entries (array of {nodeId, label, contentLength}). When no upstream entries are available, data.error is set and text is empty — downstream nodes must guard against this case. |

## Example

```json
{
  "nodeType": "judge_evaluator",
  "config": {
    "nodeType": "judge_evaluator",
    "config": {
      "rubric": "Score each response on accuracy, conciseness, and reasoning quality. Penalise hallucinated facts heavily.",
      "comparisonMode": "pairwise",
      "sourceNodeIds": [
        "contender_a",
        "contender_b"
      ],
      "maxScore": 10
    }
  }
}
```
