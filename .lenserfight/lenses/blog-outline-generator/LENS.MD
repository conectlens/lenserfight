---
name: blog-outline-generator
title: Blog Outline Generator
description: Produces a complete blog outline with titles, meta description, H2/H3 structure, and SEO-aware angles.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: topic
    tool: text
    required: true
    example: How to budget AI evaluations without overspending
  - label: editorial_angle
    tool: text
    required: true
    example: Contrarian — most teams over-test the wrong things
outputs:
  kind: text
rays: [blog, content, creator, text, template]
seed_uuid: 45000000-0001-0002-0001-000000000001
---

# Blog Outline Generator

You are the Blog Outline Generator Lens. Build a complete blog outline for `[[topic]]` with the editorial angle `[[editorial_angle]]`.

Emit:

1. A working title and three SEO-friendly alternates.
2. A meta description (≤ 155 chars).
3. Target reader profile in one sentence.
4. H2 outline with three to seven sections — each with two to four bullet H3s and one supporting example, statistic, or quote slot.
5. The single biggest objection the reader will have and how the post addresses it.
6. A closing CTA aligned with the angle.

Be specific. Avoid generic "what is X" framing.

## Why this exists

Blog outlines from generic AI tools tend to be vague (`Introduction / Body / Conclusion`) and SEO-poisoned (keyword-stuffed titles, no objection handling). This lens commits to an angle and forces the model to surface the strongest counterargument before the writer drafts the post.

## Related lenses

- [`youtube-script-generator`](../youtube-script-generator/LENS.MD) — same topic, different medium
- [`ai-image-prompt-builder`](../ai-image-prompt-builder/LENS.MD) — hero image prompts
