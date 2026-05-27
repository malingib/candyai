export async function getEmbedding(
  text: string,
  options?: { model?: string; apiKey?: string },
): Promise<number[] | null> {
  const apiKey = options?.apiKey ?? Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not found");
    return null;
  }
  const model = options?.model ?? "text-embedding-3-small";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error("Embedding API error:", err);
      return null;
    }
    const data = await resp.json();
    return data.data[0].embedding as number[];
  } catch (e) {
    console.error("Failed to get embedding:", e);
    return null;
  }
}

export async function getEmbeddingsBatch(
  texts: string[],
  options?: { model?: string; apiKey?: string },
): Promise<number[][] | null> {
  const apiKey = options?.apiKey ?? Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;
  const model = options?.model ?? "text-embedding-3-small";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error("Batch embedding API error:", err);
      return null;
    }
    const data = await resp.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  } catch (e) {
    console.error("Failed to get batch embeddings:", e);
    return null;
  }
}
