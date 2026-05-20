-- Create website_resources table for structured grounding
CREATE TABLE IF NOT EXISTS public.website_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('tender', 'event', 'news', 'project', 'job', 'contact', 'page')),
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT,
    status TEXT,
    date TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    email TEXT,
    phone TEXT,
    source_url TEXT,
    captured_at TIMESTAMPTZ DEFAULT now(),
    raw_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_resources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own website resources"
    ON public.website_resources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own website resources"
    ON public.website_resources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own website resources"
    ON public.website_resources FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own website resources"
    ON public.website_resources FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "Service role can manage all website resources"
    ON public.website_resources
    USING (true)
    WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_website_resources_user_id ON public.website_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_website_resources_type ON public.website_resources(type);
CREATE INDEX IF NOT EXISTS idx_website_resources_user_type ON public.website_resources(user_id, type);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_website_resources_updated_at
    BEFORE UPDATE ON public.website_resources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.website_resources IS 'Stores structured data extracted from client websites for precise AI grounding.';
