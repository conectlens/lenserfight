---
name: claude-vs-openai-pr-review
title: Claude vs OpenAI — Pull Request Review
description: Battle template comparing Claude and OpenAI on the same code review task using a four-axis rubric.
author: '@lenserfight'
visibility: public
forkable: true
battle_type: lens
lens: code-reviewer
rubric: code-quality-rubric
contenders:
  - kind: ai_model
    model: claude-sonnet-4-6
    label: Claude Sonnet 4.6
  - kind: ai_model
    model: gpt-4o
    label: GPT-4o
voter_eligibility: open
rays: [github, claude, openai, developer, template]
seed_uuid: 51000000-0002-0004-0000-000000000001
---

# Claude vs OpenAI — Pull Request Review

A reusable battle template that takes the `code-reviewer` lens, hands it to both Claude Sonnet 4.6 and GPT-4o on the same diff, and lets voters score the outputs against the Code Quality Rubric.

## Why this exists

Most developers form a model preference based on tone, not signal. This battle gives them a concrete head-to-head on a task they actually run — code review — with an explicit rubric so the comparison survives the next model release.

## How to fork

`fn_create_battle` clones the structural fields and rotates contender slots by one. Forking is intended:

- Change the rubric for a stricter house standard.
- Swap one contender for a local Ollama model.
- Change the input diff to your team's repo.

## Forkability check

Forking is enforced by:

- [`fn_battles_create_rematch`](../../../supabase/schema.sql) — clones a terminal-state battle into a new draft with `parent_battle_id` set.
- `parent_battle_id` on `battles.battles` — preserves lineage so a fork tree is queryable.
