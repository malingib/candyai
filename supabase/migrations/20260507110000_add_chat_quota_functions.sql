-- Atomic quota consume helper: increments chats_used only when below chats_limit.
CREATE OR REPLACE FUNCTION public.consume_chat_quota(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE public.profiles
  SET chats_used = chats_used + 1
  WHERE user_id = p_user_id
    AND chats_used < chats_limit;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_chat_quota(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_chat_quota(UUID) TO service_role;

-- Optional helper for dashboard/manual resets
CREATE OR REPLACE FUNCTION public.reset_chat_usage(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET chats_used = 0
  WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.reset_chat_usage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_chat_usage(UUID) TO service_role;
