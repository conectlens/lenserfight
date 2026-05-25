// media-content — Supabase Edge Function (Deno runtime)
//
// Streams a media object to external consumers via short-lived access token.
// GET ?object_id=<uuid>&token=<opaque>
//
// Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const objectId = url.searchParams.get('object_id')
  const token = url.searchParams.get('token')

  if (!objectId || !token) {
    return new Response(JSON.stringify({ error: 'missing_object_id_or_token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: rows, error: resolveErr } = await admin.rpc('fn_resolve_media_access_token', {
    p_object_id: objectId,
    p_token_plain: token,
  })

  if (resolveErr || !rows?.[0]) {
    return new Response(JSON.stringify({ error: 'invalid_or_expired_token' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const obj = rows[0] as {
    bucket: string | null
    object_key: string | null
    mime_type: string | null
    external_url: string | null
    lifecycle_state: string
  }

  if (obj.external_url) {
    return Response.redirect(obj.external_url, 302)
  }

  if (!obj.bucket || !obj.object_key) {
    return new Response(JSON.stringify({ error: 'no_storage_object' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(obj.bucket)
    .createSignedUrl(obj.object_key, 300)

  if (signErr || !signed?.signedUrl) {
    return new Response(JSON.stringify({ error: 'sign_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const fileRes = await fetch(signed.signedUrl)
  if (!fileRes.ok || !fileRes.body) {
    return new Response(JSON.stringify({ error: 'fetch_failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const contentType = obj.mime_type ?? fileRes.headers.get('content-type') ?? 'application/octet-stream'

  return new Response(fileRes.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  })
})
