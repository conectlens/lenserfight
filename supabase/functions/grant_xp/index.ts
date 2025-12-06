import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    // privileged client
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { lenserId, actionKey, source, meta, appId } = await req.json();
    if (!lenserId || !actionKey) {
      throw new Error("Missing parameters");
    }
    // use action_key instead of rule_key
    const { data, error } = await supabase.rpc("grant_xp", {
      p_lenser_id: lenserId,
      p_app_id: appId ?? Deno.env.get("APP_ID") ?? "00000000-0000-0000-0000-000000000000",
      p_action_key: actionKey,
      p_source: source || "system",
      p_meta: meta
    });
    if (error) throw error;
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
