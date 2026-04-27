import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── ElevenLabs (Text-to-Speech / Voice Cloning) ─────────────────────────────
// Sync: POST /v1/text-to-speech/{voice_id} → returns audio/mpeg stream.
// Supports: elevenlabs-v4, eleven_turbo_v2_5, eleven_multilingual_v2

const ELEVENLABS_BASE = 'https://api.elevenlabs.io';

// Default voice: "Rachel" — stable, neutral English voice
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export const elevenlabsAdapter: GenerativeMediaAdapter = {
  authHeader(apiKey) {
    return { 'xi-api-key': apiKey };
  },

  async generate(apiKey, model, prompt, params = {}): Promise<GenerativeMediaResult> {
    const {
      voice_id = DEFAULT_VOICE_ID,
      speed = 1.0,
      format = 'mp3',
    } = params as { voice_id?: string; speed?: number; format?: string };

    // Map model key to ElevenLabs model_id
    const modelMap: Record<string, string> = {
      'elevenlabs-v4': 'eleven_turbo_v2_5',
      'eleven_turbo_v2_5': 'eleven_turbo_v2_5',
      'eleven_multilingual_v2': 'eleven_multilingual_v2',
    };
    const modelId = modelMap[model] ?? 'eleven_turbo_v2_5';

    const outputFormat = format === 'wav' ? 'pcm_22050' : 'mp3_44100_128';

    const res = await fetch(
      `${ELEVENLABS_BASE}/v1/text-to-speech/${voice_id}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader(apiKey) },
        body: JSON.stringify({
          text: prompt,
          model_id: modelId,
          voice_settings: { speed, stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ElevenLabs error ${res.status}: ${text}`);
    }

    const blob = await res.blob();
    const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
    const url = URL.createObjectURL(blob);

    return { status: 'completed', urls: [url], mimeType };
  },
};
