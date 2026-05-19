import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, user_id } = await req.json();

    if (!url || !user_id) {
      return errorResponse("Missing URL or user_id", 400, undefined, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const response = await fetch(url);
    if (!response.ok) {
      return errorResponse(`Failed to fetch URL: ${response.statusText}`, 400, undefined, corsHeaders);
    }

    const html = await response.text();
    // Simple text extraction from HTML (strip tags)
    const text = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmb, "")
                     .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmb, "")
                     .replace(/<[^>]+>/g, " ")
                     .replace(/\s+/g, " ")
                     .trim();

    const title = url.split("/").pop() || "Crawled Page";

    const { data: kb, error: kbErr } = await supabase.from("knowledge_base").insert({
      user_id,
      title: `Page: ${title}`,
      content: text,
    }).select("id").single();

    if (kbErr) throw kbErr;

    // Trigger processing
    const internalUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (internalUrl && serviceKey) {
      fetch(`${internalUrl}/functions/v1/process-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ kb_id: kb.id, content: text, user_id }),
      }).catch(e => console.error("Delayed process-document trigger failed:", e));
    }

    return jsonResponse({ success: true, kb_id: kb.id }, 200, corsHeaders);
  } catch (e) {
    console.error("crawl-website error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500, undefined, corsHeaders);
  }
});
