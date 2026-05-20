import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse } from "../_shared/utils.ts";
import { getEmbedding } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kb_id, content, user_id } = await req.json();

    if (!kb_id || !content || !user_id) {
      return errorResponse("Missing required fields", 400, undefined, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Split content into chunks (simple split by paragraph for now, roughly 1000 chars)
    const chunks = content.split(/\n\s*\n/).filter((c: string) => c.trim().length > 0);

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      if (embedding) {
        await supabase.from("kb_embeddings").insert({
          kb_id,
          user_id,
          content: chunk,
          embedding,
        });
      }
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (e) {
    console.error("process-document error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500, undefined, corsHeaders);
  }
});
