import type { IncomingMessage, ServerResponse } from 'node:http'
import { authenticateRequest } from '../../lib/auth/authenticate'
import { sendApiError } from '../../lib/http'
import { createGeneratedMediaSignedUrl, GeneratedMedia } from '../../lib/storage'

// Phase AK — GET /v1/media/:objectId
//
// Resolves a media.objects row, verifies the caller is the owner via RLS
// (the userClient query enforces it), then redirects to a 1-hour signed URL
// for the underlying storage object. External-URL media (async providers
// that store the URL directly) get a 302 to the provider URL.

interface MediaObjectRow {
  id: string
  bucket: string
  object_key: string
  external_url: string | null
  mime_type: string | null
  visibility: string | null
  lifecycle_state: string | null
}

export async function handleMediaProxyRoute(
  req: IncomingMessage,
  res: ServerResponse,
  objectId: string,
  requestId: string,
  startedAt: number,
): Promise<void> {
  let auth
  try {
    auth = await authenticateRequest(req)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'auth_failed'
    sendApiError(res, 401, { code: 'unauthorized', message }, requestId, startedAt)
    return
  }

  // RLS on media.objects gates this query — non-owner gets an empty result.
  const { data: rawData, error } = await auth.userClient
    .schema('media')
    .from('objects')
    .select('id,bucket,object_key,external_url,mime_type,visibility,lifecycle_state')
    .eq('id', objectId)
    .maybeSingle()
  const data = rawData as MediaObjectRow | null

  if (error) {
    sendApiError(res, 500, { code: 'media_lookup_failed', message: error.message }, requestId, startedAt)
    return
  }

  if (!data) {
    // Same code for "doesn't exist" and "exists but not yours" — RLS hides
    // the latter and we don't want to leak existence.
    sendApiError(res, 404, { code: 'not_found', message: 'Media object not found' }, requestId, startedAt)
    return
  }

  if (data.lifecycle_state && data.lifecycle_state !== 'active') {
    sendApiError(
      res,
      410,
      { code: 'media_gone', message: `Media is ${data.lifecycle_state}` },
      requestId,
      startedAt,
    )
    return
  }

  // External URL path: 302 directly to the provider URL.
  if (data.external_url) {
    res.statusCode = 302
    res.setHeader('Location', data.external_url)
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.end()
    return
  }

  // Internal bucket path: 302 to a signed URL via service-role storage API.
  // We're already past the RLS check, so service-role here is safe.
  if (data.bucket !== GeneratedMedia.bucket) {
    sendApiError(
      res,
      400,
      { code: 'unsupported_bucket', message: `Cannot proxy bucket ${data.bucket}` },
      requestId,
      startedAt,
    )
    return
  }

  let signedUrl: string
  try {
    signedUrl = await createGeneratedMediaSignedUrl(auth.serviceClient, data.object_key, {
      expiresIn: 3600,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'signed_url_failed'
    sendApiError(res, 500, { code: 'signed_url_failed', message }, requestId, startedAt)
    return
  }

  res.statusCode = 302
  res.setHeader('Location', signedUrl)
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.end()

  // AT: fire-and-forget access_count increment (best-effort, errors do not affect response)
  auth.serviceClient
    .rpc('fn_media_proxy_log', { p_object_id: objectId })
    .then(({ error: logErr }) => {
      if (logErr) console.warn('[media-proxy] fn_media_proxy_log failed:', logErr.message)
    })
    .catch((e: unknown) => {
      console.warn('[media-proxy] fn_media_proxy_log threw:', e)
    })
}
