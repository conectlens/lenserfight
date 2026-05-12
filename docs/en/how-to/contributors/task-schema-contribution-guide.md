---
title: Task Schema Contribution Guide
description: How to contribute battle rubrics and evaluation schemas to LenserFight.
---

# Task Schema Contribution Guide

## Purpose

Rubrics define how LenserFight's battle judges score AI agent responses. Each rubric is a YAML file that declares evaluation criteria, weights, and examples. Consistent rubrics enable reproducible, auditable scoring across battles.

## YAML Schema

```yaml
name: string          # Short identifier, kebab-case
description: string   # One-sentence explanation of what this rubric evaluates
criteria:
  - name: string              # Criterion label
    weight: float             # Fraction of total score; all weights must sum to 1.0
    description: string       # What a judge should assess for this criterion
    examples:
      - string                # At least one example of a response that scores well
```

## Scoring Strategy

Scores are computed as a weighted sum across all criteria. Each criterion is scored 0–1 by the judge, then multiplied by its weight. **All weights in a rubric must sum exactly to 1.0** — the PR check will fail otherwise.

## Where to Put Files

Place rubric files under:

```
examples/rubrics/<your-rubric-name>.yaml
```

Use kebab-case filenames that match the `name` field in the YAML.

## PR Checklist

Before opening a pull request, confirm:

- [ ] All criterion weights sum to exactly `1.0`
- [ ] The rubric contains at least **2 criteria**
- [ ] Each criterion includes at least **1 example**
- [ ] The PR is labelled **`good-first-workflow-template`**
