
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create kb_embeddings table
CREATE TABLE public.kb_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kb_id UUID NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- 1536 dimensions for OpenAI or similar models
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kb_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own embeddings" ON public.kb_embeddings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own embeddings" ON public.kb_embeddings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own embeddings" ON public.kb_embeddings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own embeddings" ON public.kb_embeddings FOR DELETE USING (auth.uid() = user_id);

-- Create a HNSW index for better performance on similarity search
CREATE INDEX ON public.kb_embeddings USING hnsw (embedding vector_cosine_ops);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_kb_embeddings (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  kb_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_embeddings.id,
    kb_embeddings.kb_id,
    kb_embeddings.content,
    1 - (kb_embeddings.embedding <=> query_embedding) AS similarity
  FROM kb_embeddings
  WHERE kb_embeddings.user_id = p_user_id
    AND 1 - (kb_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY kb_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
