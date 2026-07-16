// IndexNow push channel. On public-transition of an entity, POST the new URL(s)
// to IndexNow (Bing, Yandex, and the shared network) for fast discovery — Google
// deprecated its sitemap-ping endpoint in 2023, so this is the modern push path.
// Best-effort: a failed ping never throws (the sitemap's recent shard is the
// pull-based backstop).

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
/** IndexNow accepts at most 10,000 URLs per request. */
const INDEXNOW_MAX_URLS = 10000

export interface IndexNowSubmission {
  /** Host without scheme, e.g. moon.lenserfight.com */
  host: string
  /** The host key (also served at https://<host>/<key>.txt). */
  key: string
  keyLocation?: string
  urls: string[]
}

export interface IndexNowResult {
  ok: boolean
  status: number
  submitted: number
}

/**
 * Submits URLs to IndexNow. Dedupes, caps at 10k, and resolves (never rejects)
 * so a caller on a write path is never blocked or broken by IndexNow being down.
 */
export async function submitToIndexNow(
  submission: IndexNowSubmission,
  fetchImpl?: typeof fetch,
): Promise<IndexNowResult> {
  const urls = Array.from(new Set(submission.urls)).slice(0, INDEXNOW_MAX_URLS)
  if (urls.length === 0) return { ok: true, status: 0, submitted: 0 }

  const body = {
    host: submission.host,
    key: submission.key,
    keyLocation:
      submission.keyLocation ?? `https://${submission.host}/${submission.key}.txt`,
    urlList: urls,
  }

  try {
    const res = await (fetchImpl ?? fetch)(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    })
    return { ok: res.ok, status: res.status, submitted: urls.length }
  } catch {
    return { ok: false, status: 0, submitted: 0 }
  }
}
