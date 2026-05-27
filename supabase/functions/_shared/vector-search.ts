import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEmbedding } from "./embeddings.ts";

const MAX_CHARS_PER_CHUNK = 2000;
const MAX_CHUNKS = 8;

export interface SearchConfig {
  matchThreshold?: number;
  matchCount?: number;
  rerank?: boolean;
}

export interface SearchResult {
  content: string;
  kb_id?: string;
  score?: number;
}

function simpleBM25(query: string, text: string): number {
  const qTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (qTerms.length === 0) return 0;
  const textLower = text.toLowerCase();
  const k1 = 1.5;
  const b = 0.75;
  const docLen = textLower.split(/\s+/).length;
  const avgDocLen = 200;
  let score = 0;
  for (const term of qTerms) {
    const tf = (textLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (tf === 0) continue;
    const idf = Math.log(1 + (1000 - qTerms.length + 0.5) / (qTerms.length + 0.5));
    score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
  }
  return score;
}

export function rerankResults(
  query: string,
  results: SearchResult[],
  topK?: number,
): SearchResult[] {
  if (results.length === 0) return results;
  const k = topK ?? results.length;

  const maxEmbeddingScore = Math.max(...results.map((r) => r.score ?? 0), 0.01);

  const scored = results.map((r) => {
    const embeddingNorm = (r.score ?? 0) / maxEmbeddingScore;
    const bm25Score = simpleBM25(query, r.content);
    const bm25Norm = Math.min(bm25Score / 5, 1);
    const combined = 0.6 * embeddingNorm + 0.4 * bm25Norm;
    return { ...r, score: combined };
  });

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, k);
}

export async function searchKnowledgeBase(
  query: string,
  userId: string,
  config?: SearchConfig,
): Promise<SearchResult[]> {
  const threshold = config?.matchThreshold ?? 0.7;
  const count = config?.rerank ? 20 : (config?.matchCount ?? 5);

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

  let results = matches.map((m: { content: string; kb_id?: string; similarity?: number }) => ({
    content: m.content.slice(0, MAX_CHARS_PER_CHUNK),
    kb_id: m.kb_id,
    score: m.similarity,
  }));

  if (config?.rerank) {
    results = rerankResults(query, results, config?.matchCount ?? 5);
  }

  return results;
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
  config?: SearchConfig,
): Promise<string> {
  if (!query) return "";

  const vectorResults = await searchKnowledgeBase(query, userId, config);
  if (vectorResults.length > 0) {
    return formatSearchContext(vectorResults);
  }

  const fallbackResults = await searchKnowledgeBaseFallback(userId);
  return formatSearchContext(fallbackResults);
}
