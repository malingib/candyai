-- Restore execute permissions for has_role used by RLS policies.
-- Revoking execute can cause policy evaluation failures (403) on user_roles queries.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
