---
title: Sora 2.0
description: Sora 2.0 by OpenAI — async video generation from text prompts.
---

# Sora 2.0

**Key:** `sora-2.0`  
**Provider:** [OpenAI](/providers/openai/)  
**Support:** `runnable`

## Capabilities

video_generation

## Specifications

| Field | Value |
|-------|-------|
| Input modalities | text |
| Output modalities | video |
| Execution pattern | Async task-poll — returns a pending task ID; execution engine polls until the clip is ready |

## When to use

Use Sora 2.0 for video generation lenses that produce clips from descriptive text prompts. Since generation is async, the Connected Lens workflow lenser handles polling automatically and delivers the result as a video URL.

## Provider documentation

→ [OpenAI Sora docs](https://platform.openai.com/docs/models/sora)
