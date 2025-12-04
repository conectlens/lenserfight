
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with Service Role to ensure write access to events
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { shortId, eventType, viewer_lenser_id, ip_hash, user_agent, referer, country } = await req.json();

    if (!shortId) {
      return new Response(JSON.stringify({ error: 'shortId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Lookup the shared link to get its internal UUID
    const { data: link, error: linkError } = await supabase
      .from('shared_links')
      .select('id')
      .eq('short_id', shortId)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: 'Link not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert the event log
    const { error: insertError } = await supabase.from('share_events').insert({
        shared_link_id: link.id,
        event_type: eventType || 'opened',
        viewer_lenser_id: viewer_lenser_id || null,
        ip_hash: ip_hash || null,
        user_agent: user_agent || null,
        referer: referer || null,
        country: country || null
    });

    if (insertError) {
        throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});