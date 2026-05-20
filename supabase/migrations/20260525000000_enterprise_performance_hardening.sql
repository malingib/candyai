-- 1. Optimized Indexes for Dashboard Search
CREATE INDEX IF NOT EXISTS idx_leads_user_email ON public.leads(user_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_user_name ON public.leads(user_id, name);
CREATE INDEX IF NOT EXISTS idx_request_logs_fn_created ON public.request_logs(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_created ON public.security_audit_logs(event_type, created_at DESC);

-- 2. Automated Log Pruning (Maintenance)
-- Enterprise-grade readiness: prevent database storage exhaustion from high-volume logs
CREATE OR REPLACE FUNCTION public.prune_old_logs(p_days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Only admins or service role should trigger this manually,
    -- but it can also be scheduled via pg_cron if available on Supabase.

    WITH deleted_requests AS (
        DELETE FROM public.request_logs
        WHERE created_at < (now() - (p_days_to_keep || ' days')::interval)
        RETURNING 1
    )
    SELECT count(*) INTO deleted_count FROM deleted_requests;

    DELETE FROM public.client_telemetry
    WHERE created_at < (now() - (p_days_to_keep || ' days')::interval);

    RETURN deleted_count;
END;
$$;

-- 3. Enhance Leads table with GIN index for partial name matches if needed (optional optimization)
-- Using trigram extension for fuzzy search readiness
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON public.leads USING gin (name gin_trgm_ops);

-- 4. Audit Log for Plan Changes
-- Track when users upgrade/downgrade for revenue audit trail
CREATE OR REPLACE FUNCTION public.log_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.plan IS DISTINCT FROM NEW.plan THEN
        INSERT INTO public.security_audit_logs (
            event_type,
            actor_id,
            target_id,
            metadata
        ) VALUES (
            'plan_change',
            NEW.user_id,
            NEW.id,
            jsonb_build_object(
                'old_plan', OLD.plan,
                'new_plan', NEW.plan,
                'reason', 'manual_update'
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_log_plan_change ON public.profiles;
CREATE TRIGGER tr_log_plan_change
    AFTER UPDATE OF plan ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_plan_change();

COMMENT ON FUNCTION public.prune_old_logs IS 'Enterprise maintenance: Prunes request_logs and telemetry older than X days.';
