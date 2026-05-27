import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEmbedding } from "./embeddings.ts";

const MAX_CHARS_PER_CHUNK = 2000;
const MAX_CHUNKS = 8;

export interface SearchConfig {
  matchThreshold?: number;
  matchCount?: number;
}

export interface SearchResult {
  content: string;
  kb_id?: string;
  score?: number;
}

export async function searchKnowledgeBase(
  query: string,
  userId: string,
  config?: SearchConfig,
): Promise<SearchResult[]> {
  const threshold = config?.matchThreshold ?? 0.7;
  const count = config?.matchCount ?? 5;

  const embedding = await getEmbedding(query);
  if (!embedding) return [];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: matches, error } = await supabase.rpc("match_kb_embeddings", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
    p_user_id: userId,
  });

  if (error || !matches || matches.length === 0) {
    if (error) console.error("KB search error:", error);
    return [];
  }

  return matches.map((m: { content: string; kb_id?: string; similarity?: number }) => ({
    content: m.content.slice(0, MAX_CHARS_PER_CHUNK),
    kb_id: m.kb_id,
    score: m.similarity,
  }));
}

export async function searchKnowledgeBaseFallback(
  userId: string,
): Promise<SearchResult[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: entries } = await supabase
    .from("knowledge_base")
    .select("id, title, content")
    .eq("user_id", userId)
    .limit(MAX_CHUNKS);

  if (!entries || entries.length === 0) return [];

  return entries.map((e: { id?: string; title?: string; content?: string }) => ({
    content: `### ${e.title ?? "Untitled"}\n${(e.content ?? "").slice(0, MAX_CHARS_PER_CHUNK)}`,
    kb_id: e.id,
  }));
}

export function formatSearchContext(results: SearchResult[]): string {
  if (!results.length) return "";
  return (
    "\n\nRelevant business information:\n\n" +
    results
      .map((r) => `- ${r.content}`)
      .join("\n\n")
  );
}

export async function buildKnowledgeContext(
  query: string | undefined,
  userId: string,
): Promise<string> {
  if (!query) return "";

  const vectorResults = await searchKnowledgeBase(query, userId);
  if (vectorResults.length > 0) {
    return formatSearchContext(vectorResults);
  }

  const fallbackResults = await searchKnowledgeBaseFallback(userId);
  return formatSearchContext(fallbackResults);
}
