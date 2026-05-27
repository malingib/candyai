import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse } from "../_shared/utils.ts";
import { getEmbeddingsBatch } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_CHUNK_SIZE = 200;
const MAX_CHUNK_SIZE = 1500;
const OVERLAP_SIZE = 100;

function smartChunk(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length > MAX_CHUNK_SIZE) {
      if (buffer.length >= MIN_CHUNK_SIZE) {
        chunks.push(buffer.trim());
        buffer = "";
      }
      const sentences = trimmed.match(/[^.!?\n]+[.!?]+\s*/g) ?? [trimmed];
      let subBuffer = "";
      for (const sent of sentences) {
        if ((subBuffer + sent).length > MAX_CHUNK_SIZE) {
          if (subBuffer.length >= MIN_CHUNK_SIZE) {
            chunks.push(subBuffer.trim());
            subBuffer = getOverlap(subBuffer, OVERLAP_SIZE);
          }
          subBuffer += sent;
        } else {
          subBuffer += sent;
        }
      }
      if (subBuffer.length >= MIN_CHUNK_SIZE) {
        chunks.push(subBuffer.trim());
      }
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${trimmed}` : trimmed;
    if (candidate.length > MAX_CHUNK_SIZE) {
      if (buffer.length >= MIN_CHUNK_SIZE) {
        chunks.push(buffer.trim());
        buffer = getOverlap(buffer, OVERLAP_SIZE) + "\n\n" + trimmed;
      } else {
        buffer = trimmed;
      }
    } else {
      buffer = candidate;
    }
  }

  if (buffer.trim().length >= MIN_CHUNK_SIZE) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

function getOverlap(text: string, overlapChars: number): string {
  const words = text.split(/\s+/);
  const overlap: string[] = [];
  let charCount = 0;
  for (let i = words.length - 1; i >= 0 && charCount < overlapChars; i--) {
    overlap.unshift(words[i]);
    charCount += words[i].length + 1;
  }
  return overlap.join(" ");
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const chunks = smartChunk(String(content));

    if (chunks.length === 0) {
      return jsonResponse({ success: true, chunks_processed: 0 }, 200, corsHeaders);
    }

    const embeddings = await getEmbeddingsBatch(chunks);
    if (!embeddings || embeddings.length !== chunks.length) {
      return errorResponse("Embedding generation failed", 500, undefined, corsHeaders);
    }

    const records = chunks.map((chunk, i) => ({
      kb_id,
      user_id,
      content: chunk,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase.from("kb_embeddings").insert(records);

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse("Failed to store embeddings", 500, undefined, corsHeaders);
    }

    return jsonResponse({ success: true, chunks_processed: chunks.length }, 200, corsHeaders);
  } catch (e) {
    console.error("process-document error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500, undefined, corsHeaders);
  }
});
