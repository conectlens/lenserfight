# Generative Media Capability Matrix

All 8 media node types and their current implementation status across both execution surfaces.

---

## Node Type Matrix

| Node type | Input source | Output | Sync/Async | Worker path | DAG runner | Notes |
|---|---|---|---|---|---|---|
| `text_to_image` | `resolvedPrompt` | `image` URL | Sync | Via `modelKind='image'` branch | `TextToImageRunner` | DALL-E 3, Stable Diffusion, FAL |
| `text_to_speech` | `resolvedPrompt` | `audio` URL | Sync | Via `modelKind='audio'` branch | `TextToSpeechRunner` | ElevenLabs, OpenAI TTS |
| `text_to_video` | `resolvedPrompt` | `video` URL or taskId | Async | Via `modelKind='video'` branch | `TextToVideoRunner` | Kling, FAL — polls via CRON |
| `image_to_image` | Upstream `image` URL | `image` URL | Sync | Not yet on worker path | `ImageToImageRunner` | Requires upstream node with `mediaType: 'image'` |
| `speech_to_text` | Upstream `audio` URL | `text` transcript | Sync | Not yet on worker path | `SpeechToTextRunner` | Requires upstream node with `mediaType: 'audio'` |
| `image_to_audio` | Upstream `image` URL | `audio` URL | Sync | Not yet on worker path | `ImageToAudioRunner` | Multimodal: image → ambient audio |
| `image_upscale` | Upstream `image` URL | `image` URL | Sync | Not yet on worker path | `ImageUpscaleRunner` | Super-resolution; `scale` param |
| `media_convert` | Upstream media URL | any | — | Not yet | throws `NotImplementedError` | No conversion service wired |

---

## Provider Support by Modality

| Provider | text→text | text→image | text→audio | text→video | text→music |
|---|---|---|---|---|---|
| OpenAI | ✅ | ✅ DALL-E 3 | ✅ TTS | ❌ | ❌ |
| Anthropic | ✅ | ❌ | ❌ | ❌ | ❌ |
| Google | ✅ | ✅ Imagen | ❌ | ❌ | ❌ |
| Mistral | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ollama | ✅ (local) | ❌ | ❌ | ❌ | ❌ |
| ElevenLabs | ❌ | ❌ | ✅ | ❌ | ❌ |
| FAL | ❌ | ✅ | ❌ | ✅ | ❌ |
| Kling | ❌ | ❌ | ❌ | ✅ | ❌ |
| Suno | ❌ | ❌ | ❌ | ❌ | ✅ |
| Stability AI | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## Async Media Flow

For `text_to_video` and `text_to_music` the provider returns immediately with a task ID:

```
Worker / DAG runner
  └─ callGenerativeMedia(provider, modality, key, model, prompt)
       └─ returns { status: 'pending', providerTaskId: 'xxx' }
            └─ stored as artifact_id in submissions (is_final: false)

poll-async-executions edge function (pg_cron every 30s)
  └─ reads submissions WHERE is_final = false
       └─ polls provider status
            └─ on 'completed': updates media_url, is_final = true, mime_type
```

---

## Upstream-Input Runners

`ImageToImageRunner`, `SpeechToTextRunner`, `ImageToAudioRunner`, and `ImageUpscaleRunner` extract their input from `ctx.upstreamOutputs`:

```typescript
for (const output of ctx.upstreamOutputs.values()) {
  if (output.mediaType === 'image' && output.url) {
    imageUrl = output.url
    break
  }
}
```

If no matching upstream output is found, the runner **throws** (not graceful fallback) — a clear diagnostic rather than silent failure.

---

## Adding a New Media Provider

1. Add the model to `libs/providers/src/lib/model-registry.ts` with the correct `outputModality`
2. Implement the provider call in `callGenerativeMedia()` in `libs/providers/src/lib/generative-media.ts`
3. The worker path picks it up automatically via `modelKind(job.model_key)`
4. The DAG runner path works via `ctx.executeProvider` (engine closes over the provider)
5. For async providers: ensure `poll-async-executions` edge function handles the new provider's polling API
