---
title: Veo 3
description: Veo 3 by Google — cinematic-quality async video generation.
---

# Veo 3

**Key:** `veo-3`  
**Provider:** [Google](/providers/google/)  
**Support:** `runnable`

## Capabilities

video_generation

## Specifications

| Field | Value |
|-------|-------|
| Input modalities | text |
| Output modalities | video |
| Execution pattern | Async task-poll |

## When to use

Produces cinematic-quality video clips from text prompts. Uses the async task-poll pattern — the execution engine submits the job and polls until the clip is ready. Use in Connected Lens workflows where video output feeds downstream steps.

## Provider documentation

→ [Google Veo docs](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
