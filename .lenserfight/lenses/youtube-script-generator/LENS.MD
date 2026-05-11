---
name: youtube-script-generator
title: YouTube Script Generator
description: Writes a structured YouTube video script with hook, value beats, pattern interrupts, and CTA.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: topic
    tool: text
    required: true
    example: How small teams should think about AI evaluations
  - label: audience
    tool: text
    required: true
    example: Engineering managers at 20-150 person companies
  - label: duration
    tool: text
    required: true
    example: '8'
outputs:
  kind: script
rays: [youtube, content, creator, script, template]
seed_uuid: 45000000-0001-0001-0001-000000000001
---

# YouTube Script Generator

You are the YouTube Script Generator Lens. Write a script for a video on `[[topic]]` aimed at `[[audience]]` with a target length of `[[duration]]` minutes.

Structure:

1. **5-second hook** designed to stop the scroll.
2. **Value promise** — what viewers will learn or feel by the end.
3. **Three to five main beats** with concrete examples (no placeholder statistics).
4. **Pattern interrupts** every 30–45 seconds: b-roll cue, visual prompt, or question to the viewer.
5. **CTA** — subscribe / next-video tease aligned to the topic, not generic.

Output as a numbered script with timestamps and parenthetical visual cues. Do not write generic platitudes.

## Why this exists

YouTube scripts written by AI tend to read like ad-copy: lots of "in today's fast-paced world" and no actual specifics. This lens forces the model to commit to a hook, beats, and CTA that are anchored to the supplied topic and audience.

## Related lenses

- [`blog-outline-generator`](../blog-outline-generator/LENS.MD) — same topic, different medium
- [`ai-image-prompt-builder`](../ai-image-prompt-builder/LENS.MD) — thumbnail concepts

## Disclaimer

None. Output is a creative draft and intended to be edited by a human creator before publishing.
