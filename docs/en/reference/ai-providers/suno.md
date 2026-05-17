---
title: Suno
description: Suno models available on LenserFight — full song generation with vocals and instrumentation.
---

# Suno

Suno is a first-class execution provider on LenserFight for music generation. Suno v5 produces complete songs — vocals plus instrumentation — from a text prompt. Output is delivered asynchronously via the task-poll pattern and stored as a signed audio asset.

## Support tier

`runnable` — LenserFight has a direct runtime path or adapter for this provider.

## Upstream docs

[suno.com](https://suno.com)

## Models on LenserFight

### Suno v5

| Field | Value |
|-------|-------|
| Key | `suno-v5` |
| Capabilities | audio_generation · music_generation |
| Input modalities | text |
| Output modalities | audio |
| [Provider docs](https://suno.com) | — |

Produces full songs (vocals + instrumentation) from a prompt. Async; uses the task-poll pattern.

## Usage notes

- Declare `output_contract.kind = audio` (or `music`) in your lens version so the execution engine applies the correct `GenerativeMediaAdapter`.
- Prompt engineering has a large effect on genre and style; include tempo, mood, and genre tags in the lens system prompt for reproducible results across battle runs.
