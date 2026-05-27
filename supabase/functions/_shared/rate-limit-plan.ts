import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_LIMITS: Record<string, { ip: number; user: number; session: number; windowMs: number }> = {
  free: { ip: 20, user: 40, session: 30, windowMs: 60_000 },
  growth: { ip: 60, user: 120, session: 90, windowMs: 60_000 },
  premium: { ip: 120, user: 240, session: 180, windowMs: 60_000 },
  enterprise: { ip: 300, user: 600, session: 400, windowMs: 60_000 },
};

export interface PlanLimits {
  ip: { limit: number; windowMs: number };
  user: { limit: number; windowMs: number };
  session: { limit: number; windowMs: number };
}

let cachedLimits: Record<string, PlanLimits> | null = null;
let lastFetch = 0;
const CACHE_TTL = 300_000;

export async function getPlanLimits(plan: string): Promise<PlanLimits> {
  const now = Date.now();
  if (!cachedLimits || now - lastFetch > CACHE_TTL) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: plans } = await supabase
        .from("billing_plans")
        .select("plan, rate_limit_ip, rate_limit_user, rate_limit_session, rate_limit_window_ms");

      if (plans && plans.length > 0) {
        cachedLimits = {};
        for (const p of plans) {
          cachedLimits[p.plan] = {
            ip: { limit: p.rate_limit_ip ?? DEFAULT_LIMITS[p.plan]?.ip ?? 20, windowMs: p.rate_limit_window_ms ?? 60_000 },
            user: { limit: p.rate_limit_user ?? DEFAULT_LIMITS[p.plan]?.user ?? 40, windowMs: p.rate_limit_window_ms ?? 60_000 },
            session: { limit: p.rate_limit_session ?? DEFAULT_LIMITS[p.plan]?.session ?? 30, windowMs: p.rate_limit_window_ms ?? 60_000 },
          };
        }
        lastFetch = now;
      }
    } catch (e) {
      console.error("Failed to fetch plan rate limits:", e);
    }
  }

  if (cachedLimits?.[plan]) return cachedLimits[plan];
  return {
    ip: { limit: DEFAULT_LIMITS[plan]?.ip ?? 20, windowMs: 60_000 },
    user: { limit: DEFAULT_LIMITS[plan]?.user ?? 40, windowMs: 60_000 },
    session: { limit: DEFAULT_LIMITS[plan]?.session ?? 30, windowMs: 60_000 },
  };
}
