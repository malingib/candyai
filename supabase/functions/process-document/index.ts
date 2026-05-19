import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not found");
    return null;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Embedding API error:", error);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error("Failed to get embedding:", e);
    return null;
  }
}

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
