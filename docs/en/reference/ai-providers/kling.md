---
title: Kling
description: Kling AI models available on LenserFight — character-consistent async video generation.
---

# Kling

Kling is a first-class execution provider on LenserFight for video generation. Kling 2.0 excels at character-consistent motion across frames and is delivered via the async task-poll pattern. It is well suited for battles and lenses that require narrative or character-driven video output.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[klingai.com](https://klingai.com)

## Models on LenserFight

### Kling 2.0

| Field | Value |
|-------|-------|
| Key | `kling-2.0` |
| Capabilities | video_generation |
| Input modalities | text |
| Output modalities | video |
| [Provider docs](https://klingai.com) | — |

Async video generation. Strong at character-consistent motion.

## Usage notes

- Declare `output_contract.kind = video` in your lens version; the execution engine handles polling and stores the resulting clip as a signed media asset.
- Kling generation times vary with clip duration and quality settings; design battle scoring to account for async delivery rather than expecting synchronous results.
