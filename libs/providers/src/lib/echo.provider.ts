import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── Echo Provider (AS) — local development only ─────────────────────────────
// Mirrors the input prompt as output — no API calls made.
// Only registered when USE_ECHO_PROVIDER=true.

export const echoAdapter: GenerativeMediaAdapter = {
  authHeader() {
    return {};
  },

  async generate(_apiKey, _model, prompt): Promise<GenerativeMediaResult> {
    return {
      status: 'completed',
      urls: [],
      mimeType: 'text/plain',
      // Store echoed text in metadata for callers that want to inspect it
      ...(({ text: prompt }) as unknown as object),
    } as GenerativeMediaResult & { text: string };
  },
};
