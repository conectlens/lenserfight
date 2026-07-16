// Crawler / unfurler / AI-bot User-Agent detection. The Worker renders bot HTML
// only for these; every other UA is proxied straight to the SPA assets. Googlebot
// is intentionally treated as a bot — we serve it pre-rendered HTML rather than
// relying on its JS render queue (production evidence: entity pages currently
// snapshot before runtime meta is applied).

const CRAWLER_TOKENS: readonly string[] = [
  // Search engines
  'googlebot',
  'bingbot',
  'duckduckbot',
  'yandexbot',
  'applebot',
  'amazonbot',
  'baiduspider',
  // Social unfurlers
  'facebookexternalhit',
  'twitterbot',
  'slackbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'pinterest',
  'redditbot',
  // AI / answer engines (training + retrieval + live fetchers)
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'perplexitybot',
  'perplexity-user',
  'google-extended',
  'cohere-ai',
  'bytespider',
  'ccbot',
] as const

/** True if the User-Agent belongs to a known crawler/unfurler/AI bot. */
export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return CRAWLER_TOKENS.some((token) => ua.includes(token))
}
