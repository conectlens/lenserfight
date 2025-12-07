import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateShortId(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();

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

    // First: check if link already exists for same (resource_type, resource_id, creator)
    const { data: existing, error: existingErr } = await supabase
      .from("shared_links")
      .select("*")
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .eq("creator_lenser_id", creatorLenserId)
      .maybeSingle();

    if (existingErr) throw existingErr;

    let finalShortId = existing?.short_id ?? generateShortId();

    const payload = {
      short_id: finalShortId,
      resource_type: resourceType,
      resource_id: resourceId,
      slug: slug ?? null,
      creator_lenser_id: creatorLenserId,
      channel: channel ?? "in_app",
      meta: meta ?? {},
      display_name: displayName ?? null,
    };

    // Atomic UPSERT using unique index (resource_type, resource_id, creator_lenser_id)
    const { data: link, error } = await supabase
      .from("shared_links")
      .upsert(payload, {
        onConflict: "resource_type,resource_id,creator_lenser_id",
      })
      .select()
      .single();

    if (error) throw error;

    // Log only if record was newly created
    if (!existing) {
      const ua = req.headers.get("user-agent") ?? null;

      await supabase.from("share_events").insert({
        shared_link_id: link.id,
        event_type: "generated",
        viewer_lenser_id: creatorLenserId,
        user_agent: ua,
      });
    }

    return new Response(JSON.stringify(link), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
