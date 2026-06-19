---
name: blog-writer
description: From topic to publishable draft — research, outline, draft, SEO metadata.
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
