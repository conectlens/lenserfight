import { ProviderError, mapHttpError, withTimeout } from './provider-errors';
import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── ElevenLabs (Text-to-Speech / Voice Cloning) ─────────────────────────────
// Sync POST /v1/text-to-speech/{voice_id} → raw audio bytes.
// Verified: https://elevenlabs.io/docs/api-reference/text-to-speech
// `model_id` accepts: eleven_multilingual_v2, eleven_turbo_v2_5, eleven_v3 …
// `output_format`: mp3_44100_128 (default), pcm_22050, etc.

const ELEVENLABS_BASE = 'https://api.elevenlabs.io';
const PROVIDER = 'ElevenLabs';

// Default voice: "Rachel" — stable neutral English voice.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const VALID_MODELS = new Set([
  'eleven_multilingual_v2',
  'eleven_turbo_v2_5',
  'eleven_turbo_v2',
  'eleven_v3',
]);

const FORMAT_TO_MIME: Record<string, { wire: string; mime: string }> = {
  mp3: { wire: 'mp3_44100_128', mime: 'audio/mpeg' },
  wav: { wire: 'pcm_22050', mime: 'audio/wav' },
  opus: { wire: 'opus_48000_128', mime: 'audio/ogg' },
};

function bufferToBase64(buf: ArrayBuffer): string {
  // Node + browser-compatible base64 encoding without depending on Buffer typings.
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  // btoa is available in Node 16+ and every modern browser.
  return btoa(binary);
}

export const elevenlabsAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { 'xi-api-key': apiKey };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
    if (!prompt || !prompt.trim()) {
      throw new ProviderError({
        code: 'invalid_request',
        message: 'Text-to-speech requires a non-empty prompt.',
        provider: PROVIDER,
        model,
      });
    }
    const {
      voice_id = DEFAULT_VOICE_ID,
      speed = 1.0,
      format = 'mp3',
    } = params as { voice_id?: string; speed?: number; format?: string };

    const wireModel = VALID_MODELS.has(model) ? model : 'eleven_multilingual_v2';
    const fmt = FORMAT_TO_MIME[format] ?? FORMAT_TO_MIME.mp3;

    const url = `${ELEVENLABS_BASE}/v1/text-to-speech/${encodeURIComponent(voice_id)}?output_format=${fmt.wire}`;

    const res = await withTimeout(
      (signal) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify({
          text: prompt,
          model_id: wireModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            ...(speed !== 1.0 ? { speed } : {}),
          },
        }),
        signal,
      }),
      { provider: PROVIDER, model: wireModel, ms: 60_000 },
    );

    if (!res.ok) {
      throw await mapHttpError(res, {
        provider: PROVIDER,
        model: wireModel,
        notFoundMessage: `ElevenLabs voice "${voice_id}" not found.`,
      });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) {
      throw new ProviderError({
        code: 'server_error',
        message: 'ElevenLabs returned no audio data.',
        provider: PROVIDER,
        model: wireModel,
      });
    }
    const base64 = bufferToBase64(buf);
    return { status: 'completed', urls: [`data:${fmt.mime};base64,${base64}`], mimeType: fmt.mime };
  },
};
