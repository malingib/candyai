const QDRANT_URL = Deno.env.get("QDRANT_URL");
const QDRANT_API_KEY = Deno.env.get("QDRANT_API_KEY");
const COLLECTION_NAME = "kb_embeddings";
const EMBEDDING_DIM = 1536;

export function isQdrantConfigured(): boolean {
  return !!QDRANT_URL && !!QDRANT_API_KEY;
}

export async function qdrantUpsert(
  points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>,
): Promise<boolean> {
  if (!isQdrantConfigured()) return false;
  try {
    const resp = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": QDRANT_API_KEY!,
      },
      body: JSON.stringify({ points }),
    });
    return resp.ok;
  } catch (e) {
    console.error("Qdrant upsert error:", e);
    return false;
  }
}

export async function qdrantSearch(
  vector: number[],
  filter?: Record<string, unknown>,
  limit = 10,
): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
  if (!isQdrantConfigured()) return [];
  try {
    const resp = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": QDRANT_API_KEY!,
      },
      body: JSON.stringify({
        vector,
        limit,
        filter,
        with_payload: true,
      }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.result ?? []).map((p: { id: string; score: number; payload: Record<string, unknown> }) => ({
      id: p.id,
      score: p.score,
      payload: p.payload,
    }));
  } catch (e) {
    console.error("Qdrant search error:", e);
    return [];
  }
}

export async function qdrantDeleteCollection(): Promise<boolean> {
  if (!isQdrantConfigured()) return false;
  try {
    const resp = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: "DELETE",
      headers: { "api-key": QDRANT_API_KEY! },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function qdrantEnsureCollection(): Promise<boolean> {
  if (!isQdrantConfigured()) return false;
  try {
    const check = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      headers: { "api-key": QDRANT_API_KEY! },
    });
    if (check.ok) return true;
    const resp = await fetch(`${QDRANT_URL}/collections`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": QDRANT_API_KEY!,
      },
      body: JSON.stringify({
        name: COLLECTION_NAME,
        vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
      }),
    });
    return resp.ok;
  } catch (e) {
    console.error("Qdrant ensure collection error:", e);
    return false;
  }
}
