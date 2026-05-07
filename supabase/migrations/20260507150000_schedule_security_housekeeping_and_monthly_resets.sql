-- Security maintenance and quota reset orchestration.
-- Includes:
-- 1) callable monthly reset function (chat + inference quotas)
-- 2) combined maintenance function
-- 3) optional pg_cron schedules when extension is available
-- 4) documented SQL fallback for external schedulers

CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET chats_used = 0,
      monthly_inference_used_tokens = 0;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_monthly_quotas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_monthly_quotas() TO service_role;

CREATE OR REPLACE FUNCTION public.run_scheduled_security_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.security_housekeeping();

  -- Run monthly quota reset only on the first day of the month (UTC).
  IF date_part('day', timezone('UTC', now())) = 1 THEN
    PERFORM public.reset_monthly_quotas();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.run_scheduled_security_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_scheduled_security_maintenance() TO service_role;

DO $$
BEGIN
  -- Schedule only if pg_cron is installed and cron.schedule is available.
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'cron'
      AND p.proname = 'schedule'
  ) THEN
    PERFORM cron.schedule(
      'security-housekeeping-hourly',
      '0 * * * *',
      $$SELECT public.security_housekeeping();$$
    );

    PERFORM cron.schedule(
      'quota-resets-monthly',
      '5 0 1 * *',
      $$SELECT public.reset_monthly_quotas();$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: scheduler setup can be managed externally.
  RAISE NOTICE 'pg_cron schedule setup skipped: %', SQLERRM;
END $$;

COMMENT ON FUNCTION public.run_scheduled_security_maintenance() IS
'Convenience entrypoint for external schedulers. SQL: SELECT public.run_scheduled_security_maintenance();';
