---
title: Media Generation Nodes | Workflow Node Reference
description: Reference for all Media Generation nodes in LenserFight Workflow Studio — image, audio, video, and speech generation and conversion.
---

# Media Generation Nodes

Media nodes generate and convert images, audio, video, and speech using provider-hosted AI models. All media output should be stored with Object Storage Upload before referencing in downstream nodes.

| Node | Type | Output |
|------|------|--------|
| [Text to Image](#text-to-image) | `text_to_image` | `image` |
| [Image to Image](#image-to-image) | `image_to_image` | `image` |
| [Image to Audio](#image-to-audio) | `image_to_audio` | `audio` |
| [Text to Speech](#text-to-speech) | `text_to_speech` | `audio` |
| [Speech to Text](#speech-to-text) | `speech_to_text` | `text` |
| [Text to Video](#text-to-video) | `text_to_video` | `video` |
| [Image Upscale](#image-upscale) | `image_upscale` | `image` |
| [Media Convert](#media-convert) | `media_convert` | `file` |

---

## Text to Image {#text-to-image}

**Type:** `text_to_image` · **Category:** Media Generation

Generate an image from a text prompt using configured provider and model.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `text` | `text` | Yes — the generation prompt |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `image` | `image` | `{ url: text, mimeType: text }` |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model identifier (e.g. `fal-ai/flux/dev`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `provider` | `select` | `fal-ai` |
| `promptPath` | `string` | `$.prompt` |
| `size` | `string` | `1024x1024` |

### Example

```json
{
  "provider": "fal-ai",
  "model": "fal-ai/flux/dev",
  "promptPath": "$.prompt",
  "size": "1024x1024"
}
```

**Expected output:** `{ "image": { "url": "blob:image", "mimeType": "image/png" } }`

**Downstream:** → `object_storage_upload`

### Execution Notes

- Media generation requires `user_byok_cloud` or a platform plan with media credits.
- Use `object_storage_upload` immediately after to persist the generated file — in-memory blobs are not preserved across workflow steps.

### Related Nodes

[Image to Image](#image-to-image) · [Object Storage Upload](./storage#object-storage-upload) · [Image Upscale](#image-upscale)

---

## Image to Image {#image-to-image}

**Type:** `image_to_image` · **Category:** Media Generation

Transform an input image with a text prompt (inpainting, style transfer, editing).

### Inputs

| Name | Type | Required |
|------|------|----------|
| `image` | `image` | Yes |
| `prompt` | `text` | No |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model identifier. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `provider` | `string` | `fal-ai` |
| `imagePath` | `string` | `$.image.url` |
| `prompt` | `string` | — |

### Example

```json
{
  "provider": "fal-ai",
  "model": "fal-ai/flux-pro/kontext",
  "imagePath": "$.image.url",
  "prompt": "Create a polished arena card"
}
```

**Downstream:** → `object_storage_upload`

---

## Image to Audio {#image-to-audio}

**Type:** `image_to_audio` · **Category:** Media Generation

Generate audio from an image description using a text-to-audio model.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `image` | `image` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model identifier. |

### Example

```json
{
  "provider": "fal-ai",
  "model": "fal-ai/stable-audio",
  "imagePath": "$.image.url",
  "prompt": "Ambient intro for the battle replay"
}
```

**Expected output:** `{ "audio": { "url": "blob:audio", "mimeType": "audio/mpeg" } }`

**Downstream:** → `object_storage_upload`

---

## Text to Speech {#text-to-speech}

**Type:** `text_to_speech` · **Category:** Media Generation

Generate spoken audio from text.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `text` | `text` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `voice` | `string` | Voice identifier (e.g. `alloy`, `nova`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `provider` | `string` | `openai` |
| `model` | `string` | `gpt-4o-mini-tts` |
| `textPath` | `string` | `$.summary` |

### Example

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini-tts",
  "voice": "alloy",
  "textPath": "$.summary"
}
```

**Expected output:** `{ "audio": { "url": "blob:tts", "mimeType": "audio/mpeg" } }`

**Downstream:** → `object_storage_upload`

### Related Nodes

[Speech to Text](#speech-to-text) · [Summarizer](./ai-primitives#summarizer)

---

## Speech to Text {#speech-to-text}

**Type:** `speech_to_text` · **Category:** Media Generation

Transcribe speech audio into text with timestamps.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `audio` | `audio` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Transcription model. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `provider` | `string` | `openai` |
| `audioPath` | `string` | `$.audio.url` |

### Example

```json
{
  "provider": "openai",
  "model": "gpt-4o-transcribe",
  "audioPath": "$.audio.url"
}
```

**Expected output:** `{ "text": "The battle winner is..." }`

**Downstream:** → `summarizer`

### Valid Connections

→ `summarizer`, `prompt_template`, `classifier`, `translator`

### Related Nodes

[Text to Speech](#text-to-speech) · [Audio Transcribe](./ai-primitives#audio-transcribe) · [Summarizer](./ai-primitives#summarizer)

---

## Text to Video {#text-to-video}

**Type:** `text_to_video` · **Category:** Media Generation

Generate a video from a text prompt.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `text` | `text` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Video generation model. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `provider` | `string` | `fal-ai` |
| `promptPath` | `string` | `$.prompt` |
| `durationSeconds` | `number` | `8` |
| `aspectRatio` | `string` | `16:9` |

### Example

```json
{
  "provider": "fal-ai",
  "model": "fal-ai/veo3",
  "promptPath": "$.prompt",
  "durationSeconds": 8,
  "aspectRatio": "16:9"
}
```

**Expected output:** `{ "video": { "url": "blob:video", "mimeType": "video/mp4" } }`

**Downstream:** → `object_storage_upload`

### Execution Notes

- Video generation is the most resource-intensive media operation. Use `retry` with generous `backoffMs`.
- Always persist with `object_storage_upload` immediately after.

---

## Image Upscale {#image-upscale}

**Type:** `image_upscale` · **Category:** Media Generation

Upscale an image using a super-resolution model.

### Inputs

| Name | Type | Required |
|------|------|----------|
| `image` | `image` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `scale` | `number` | Upscale factor (e.g. `2`, `4`). |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `provider` | `string` | `fal-ai` |
| `model` | `string` | `fal-ai/esrgan` |
| `imagePath` | `string` | `$.image.url` |

### Example

```json
{
  "provider": "fal-ai",
  "model": "fal-ai/esrgan",
  "imagePath": "$.image.url",
  "scale": 2
}
```

**Downstream:** → `object_storage_upload`

---

## Media Convert {#media-convert}

**Type:** `media_convert` · **Category:** Media Generation

Convert media between supported formats (e.g. WAV → MP3, MP4 → WebM).

### Inputs

| Name | Type | Required |
|------|------|----------|
| `file` | `file` | Yes |

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `targetFormat` | `string` | Output format extension (e.g. `mp3`, `webm`, `png`). |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `inputPath` | `string` | Input file URL mapping. |
| `audioBitrate` | `string` | Audio bitrate (e.g. `128k`). |

### Example

```json
{
  "targetFormat": "mp3",
  "inputPath": "$.file.url",
  "audioBitrate": "128k"
}
```

**Downstream:** → `object_storage_upload`

---

**See also:** [Node Catalog Index](./) · [Storage Nodes](./storage) · [AI Primitive Nodes](./ai-primitives) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
