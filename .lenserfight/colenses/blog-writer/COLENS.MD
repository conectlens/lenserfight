---
name: blog-writer
title: Blog Writer Colens
description: From topic to publishable draft — research, outline, draft, SEO metadata.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: research
    lens: intent-clarifier
    note: Refine the editorial brief and surface assumptions.
  - id: outline
    lens: blog-outline-generator
    inputs_from: research
  - id: image
    lens: ai-image-prompt-builder
    inputs_from: outline
    note: Hero image prompt for the post header.
  - id: validate
    lens: validate-output
    inputs_from: outline
outputs:
  kind: text
rays: [blog, content, creator, colens, template]
seed_uuid: 48000000-0002-0002-0001-000000000001
---

# Blog Writer Colens

A 4-node colens that converts a topic and angle into a publishable blog outline with an accompanying hero-image prompt and a validation pass.

## Node order

1. `research` → `intent-clarifier` — surfaces hidden assumptions in the topic.
2. `outline` → `blog-outline-generator` — turns the clarified intent into structure.
3. `image` → `ai-image-prompt-builder` — drafts a hero-image prompt aligned with the outline.
4. `validate` → `validate-output` — runs the outline against the SEO and angle constraints.

## When to fork

Fork this colens when:

- The publication has its own house style and you want a different draft lens after outline.
- You want to inject a `code-explainer` step before validate for technical posts.
- You are running on a publishing schedule and need a different validate criterion (length, tone).

## What this colens is NOT

- It is not a publishing pipeline. The final output is a draft + asset prompts, not a CMS commit.
- It does not fact-check. Use `research` (longer-running) for that.
