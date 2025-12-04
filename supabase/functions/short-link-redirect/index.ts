// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deno already provides global crypto.subtle — do NOT import crypto from std.
// Removed invalid crypto import.

// Hash IP with SHA-256
async function hashIp(ip: string) {
  const salt = Deno.env.get("IP_SALT") ?? "";
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  try {
    const url = new URL(req.url);

    // Path: /s/:shortId or /s/abc123
    const segments = url.pathname.split("/").filter(Boolean);

    // Expect ["s", "shortId"]
    const shortId = segments.length >= 2 ? segments[1] : null;

    if (!shortId) {
      return new Response("Not Found", { status: 404 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Lookup link
    const { data: link, error: linkErr } = await supabase
      .from("shared_links")
      .select("*")
      .eq("short_id", shortId)
      .single();

    if (linkErr || !link) {
      return Response.redirect(`${url.origin}/`, 302);
    }

    // 2. Log event
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const hashedIp = await hashIp(ip);

    await supabase.from("share_events").insert({
      shared_link_id: link.id,
      event_type: "opened",
      ip_hash: hashedIp,
      user_agent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
      country: req.headers.get("cf-ipcountry")
    });

    // 3. Construct redirect
    const baseUrl = Deno.env.get("APP_BASE_URL") ?? "http://localhost:3000";

    if (link.resource_type === "external") {
      let dest = link.meta?.targetUrl || link.resource_id;
      if (!dest.startsWith("http")) dest = "https://" + dest;
      return Response.redirect(dest, 302);
    }

    // Internal resources
    let dest = "/app";

    if (link.resource_type === "prompt") {
      dest = `/prompts/${link.slug ?? link.resource_id}`;
    } else if (link.resource_type === "thread") {
      dest = `/threads/${link.resource_id}`;
    } else if (link.resource_type === "profile") {
      dest = `/lenser/${link.slug ?? link.resource_id}`;
    }

    return Response.redirect(`${baseUrl}/#${dest}`, 302);
  } catch (err) {
    return new Response(`Internal Error: ${err}`, { status: 500 });
  }
});
