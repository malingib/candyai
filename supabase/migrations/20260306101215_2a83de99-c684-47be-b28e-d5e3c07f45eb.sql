
-- Table to log AI reviews posted on PRs
CREATE TABLE public.github_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repo text NOT NULL,
  pr_number integer NOT NULL,
  pr_title text NOT NULL DEFAULT '',
  review_body text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.github_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own github_reviews" ON public.github_reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert github_reviews" ON public.github_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow service role insert (webhook uses service role)
CREATE POLICY "Service role can insert github_reviews" ON public.github_reviews
  FOR INSERT TO service_role
  WITH CHECK (true);
