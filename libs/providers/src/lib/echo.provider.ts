import type { GenerativeMediaAdapter, GenerativeMediaResult } from './types';

// ─── Echo Provider (AS) — local development only ─────────────────────────────
// Mirrors the input prompt as output — no API calls made.
// Only registered when USE_ECHO_PROVIDER=true.

export const echoAdapter: GenerativeMediaAdapter = {
  authHeader() {
    return {};
  },

  async generate(_apiKey, _model, prompt): Promise<GenerativeMediaResult> {
    // Echo the prompt back as a base64-encoded data URL so callers receive a
    // valid `urls[0]` without making an HTTP call. Useful for local dev.
    const encoded = typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(prompt)))
      : Buffer.from(prompt, 'utf-8').toString('base64');
    return {
      status: 'completed',
      urls: [`data:text/plain;base64,${encoded}`],
      mimeType: 'text/plain',
    };
  },
};
