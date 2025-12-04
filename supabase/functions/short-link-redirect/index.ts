
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

declare const Deno: any;

// Helper to hash IP
async function hashIp(ip: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get('IP_SALT')); // Salt env var
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  const url = new URL(req.url);
  // Pattern: /s/:shortId
  const pathParts = url.pathname.split('/');
  const shortId = pathParts[pathParts.length - 1];

  if (!shortId) return new Response("Not Found", { status: 404 });

  const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
  );

  // 1. Lookup Link
  const { data: link } = await supabase
    .from('shared_links')
    .select('*')
    .eq('short_id', shortId)
    .single();

  if (!link) {
      // Fallback redirect to home
      return Response.redirect(`${url.origin}/`, 302);
  }

  // 2. Async Logging (Fire and forget style if possible, or await)
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const hashedIp = await hashIp(ip);
  const userAgent = req.headers.get('user-agent');
  const referer = req.headers.get('referer');
  
  await supabase.from('share_events').insert({
      shared_link_id: link.id,
      event_type: 'opened',
      ip_hash: hashedIp,
      user_agent: userAgent,
      referer: referer,
      country: req.headers.get('cf-ipcountry') // If using Cloudflare
  });

  // 3. Construct Destination
  let dest = '/app';
  const baseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://lenserfight.com';

  if (link.resource_type === 'external') {
      // Prioritize targetUrl in meta, fallback to resource_id (though likely UUID now)
      dest = link.meta?.targetUrl || link.resource_id;
      // Ensure absolute URL
      if (!dest.startsWith('http')) {
          dest = 'https://' + dest;
      }
      // Return 302 for external
      return Response.redirect(dest, 302);
  } 
  
  if (link.resource_type === 'prompt') {
      dest = `/prompts/${link.slug || link.resource_id}`;
  } else if (link.resource_type === 'thread') {
      dest = `/threads/${link.resource_id}`;
  } else if (link.resource_type === 'profile') {
      dest = `/lenser/${link.slug || link.resource_id}`;
  }

  // 4. Redirect App
  return Response.redirect(`${baseUrl}/#${dest}`, 302);
});
