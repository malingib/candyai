import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse } from "../_shared/utils.ts";
import { callAI } from "../_shared/ai.ts";

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

    // --- Structured Resource Extraction (Option 3 & 4) ---
    // Use LLM to extract structured resources from the page text
    const extractionPrompt = `
      Extract structured resources from the following website text.
      Identify: tenders, events, news, projects, jobs, and contact information.
      Return a JSON array of objects with these fields:
      - type: 'tender' | 'event' | 'news' | 'project' | 'job' | 'contact'
      - title: string
      - summary: string (optional)
      - url: string (absolute URL if found, else null)
      - status: string (e.g., 'open', 'closed', 'ongoing' - optional)
      - date: ISO8601 string (optional)
      - deadline: ISO8601 string (optional)
      - email: string (optional)
      - phone: string (optional)
      - metadata: object (any other relevant structured data)

      Only return the JSON array. If nothing is found, return [].
      Source URL: ${url}

      Text:
      ${text.slice(0, 8000)}
    `;

    const aiResult = await callAI([
      { role: "system", content: "You are a specialized web data extractor. Output JSON only." },
      { role: "user", content: extractionPrompt }
    ]);

    if (aiResult?.choices?.[0]?.message?.content) {
      try {
        let content = aiResult.choices[0].message.content.trim();
        // Handle markdown code blocks if present
        if (content.includes("```json")) {
          content = content.split("```json")[1].split("```")[0].trim();
        } else if (content.includes("```")) {
          content = content.split("```")[1].split("```")[0].trim();
        }

        const resources = JSON.parse(content);

        if (Array.isArray(resources) && resources.length > 0) {
          const toInsert = resources.map(r => ({
            ...r,
            user_id,
            source_url: url,
            captured_at: new Date().toISOString()
          }));

          await supabase.from("website_resources").insert(toInsert);
        }
      } catch (e) {
        console.error("Failed to parse or insert structured resources:", e);
      }
    }

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
