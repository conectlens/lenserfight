// Deno Edge Function (Supabase) — Corrected Version
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Generate random short ID
function generateShortId(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

serve(async (req) => {
  // Preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse JSON safely
    let body;
    try {
      body = await req.json();
    } catch (_) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const {
      resourceType,
      resourceId,
      slug,
      channel,
      meta,
      creatorLenserId,
      displayName,
    } = body;

    if (!creatorLenserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Generate a unique shortId, retry if collision occurs
    let shortId = generateShortId();
    let isUnique = false;

    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabase
        .from("shared_links")
        .select("id")
        .eq("short_id", shortId)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
        break;
      }

      // Collision – regenerate
      shortId = generateShortId();
    }

    if (!isUnique) {
      return new Response(JSON.stringify({ error: "Failed to generate unique ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Insert shared link
    const { data: link, error: linkError } = await supabase
      .from("shared_links")
      .insert({
        short_id: shortId,
        resource_type: resourceType,
        resource_id: resourceId, // UUID preferred
        slug: slug ?? null,
        creator_lenser_id: creatorLenserId,
        channel: channel ?? "in_app",
        meta: meta ?? {},
        display_name: displayName ?? null,
      })
      .select()
      .single();

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log generator event
    await supabase.from("share_events").insert({
      shared_link_id: link.id,
      event_type: "generated",
      viewer_lenser_id: creatorLenserId,
      user_agent: req.headers.get("user-agent"),
    });

    return new Response(JSON.stringify(link), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
