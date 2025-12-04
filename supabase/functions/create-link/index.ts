
// Follow this pattern for Deno Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to generate random short ID
function generateShortId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service Role for writing events
    );

    // Get body
    const { resourceType, resourceId, slug, channel, meta, creatorLenserId, displayName } = await req.json();

    if (!creatorLenserId) {
       return new Response("Unauthorized", { 
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
    }

    // Generate Unique ID
    let shortId = generateShortId();
    // In production, loop to ensure uniqueness against DB collisions
    
    // Insert Link
    const { data: link, error: linkError } = await supabase
      .from('shared_links')
      .insert({
        short_id: shortId,
        resource_type: resourceType,
        resource_id: resourceId, // Must be UUID
        slug: slug,
        creator_lenser_id: creatorLenserId,
        channel: channel || 'in_app',
        meta: meta || {},
        display_name: displayName || null
      })
      .select()
      .single();

    if (linkError) throw linkError;

    // Log Event
    await supabase.from('share_events').insert({
        shared_link_id: link.id,
        event_type: 'generated',
        viewer_lenser_id: creatorLenserId,
        user_agent: req.headers.get('user-agent'),
        // No IP logging for generation usually needed, or hash it if required
    });

    return new Response(JSON.stringify(link), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500 
    });
  }
});
