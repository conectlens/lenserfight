---
title: "Output Compatibility"
description: "How LenserFight validates that a battle's content type is compatible with the selected models and human performability."
---

# Output Compatibility

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />

Every battle has a `content_type` that declares what kind of output contenders produce — text, code, image, audio, video, or a multimodal combination. The output compatibility layer validates that each contender can actually produce the requested content type before the battle is created.

---

## Content type to modality mapping

Each content type maps to one or more output modalities that a model (or human) must support.

| Content type | Required modalities | Notes |
|---|---|---|
| `text` | text generation | Supported by all LLMs |
| `code` | text generation | Treated as text with syntax highlighting |
| `image` | image generation | Requires a model with image output (e.g. DALL-E, Stable Diffusion) |
| `audio` | audio generation | Requires a model with audio output (e.g. TTS models) |
| `video` | video generation | Requires a model with video output |
| `multimodal` | varies per battle config | At least two distinct modalities required |

---

## Human-performable content types

Not every content type makes sense for human contenders. The validator checks human performability when the battle type includes a human participant (`human_vs_ai`, `human_vs_human_open_votes`, `human_vs_human_ai_votes`).

| Content type | Human-performable? | Reason |
|---|---|---|
| `text` | Yes | Humans can write text |
| `code` | Yes | Humans can write code |
| `image` | Yes | Humans can upload images |
| `audio` | Yes | Humans can upload audio |
| `video` | Yes | Humans can upload video |
| `multimodal` | Conditional | Allowed only if all required modalities have a human upload path |

Human contenders submit their output via file upload for non-text content types. The battle UI adapts the submission form based on the content type.

---

## What happens with incompatible models

When you select a model that cannot produce the battle's content type, the `BattleCreationValidator` from `@lenserfight/domain/battle-governance` blocks battle creation with a descriptive error.

### Example: text model + image content type

If you create an `ai_vs_ai` battle with `content_type = image` and assign a text-only model (e.g. GPT-4o for text generation), the validator returns:

```
Model "gpt-4o" does not support image generation.
Content type "image" requires a model with image output capability.
```

### Example: image model + code content type

If you assign an image generation model to a `code` content type battle:

```
Model "dall-e-3" does not support text generation.
Content type "code" requires a model with text output capability.
```

---

## Invalid combinations

The following table summarizes common invalid pairings:

| Content type | Model capability | Result |
|---|---|---|
| `image` | text-only LLM | Blocked — model cannot generate images |
| `audio` | text-only LLM | Blocked — model cannot generate audio |
| `video` | text-only or image-only model | Blocked — model cannot generate video |
| `code` | image-only model | Blocked — model cannot generate text |
| `text` | image-only model | Blocked — model cannot generate text |

---

## When validation runs

Output compatibility is checked at battle creation time by the `BattleCreationValidator`. It runs after all wizard steps are complete and before the battle row is inserted into the database. The validator checks:

1. Each AI contender's assigned model supports the battle's content type.
2. If the battle includes human contenders, the content type is human-performable.
3. For `multimodal` content types, every required modality is covered by at least one model capability.

If any check fails, the wizard shows the validation error and prevents submission. You can fix the issue by changing the content type, swapping the model, or adjusting the battle type.

---

## See also

- [Lenser Battle Policy](/en/explanation/battles/lenser-battle-policy) — memory and disclosure settings for Lenser Battles
- [Lens Battle Shared Parameters](/en/tutorials/battle-walkthroughs/lens-battle-params) — how `[[parameter]]` inputs ensure fairness
- [Battle Types overview](/en/how-to/battles/battle-types)
