import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyJWT } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type BillingPlan = {
  plan: string;
  chats_limit: number;
  leads_limit: number;
  widget_sites_limit: number;
};

async function fetchBillingPlan(
  supabaseAdmin: ReturnType<typeof createClient>,
  plan: string,
): Promise<BillingPlan | null> {
  const { data, error } = await supabaseAdmin
    .from("billing_plans")
    .select("plan, chats_limit, leads_limit, widget_sites_limit")
    .eq("plan", plan)
    .maybeSingle();
  if (error || !data) return null;
  return data as BillingPlan;
}

function validEmail(v: string): boolean {
  if (!v || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validPlan(v: string): v is "free" | "growth" | "premium" | "enterprise" {
  return ["free", "growth", "premium", "enterprise"].includes(v);
}

async function ensureAdmin(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return { ok: false, message: "Missing bearer token" };
  const token = auth.slice(7);
  const claims = await verifyJWT(token);
  if (!claims?.sub || !isUuid(claims.sub)) return { ok: false, message: "Invalid token" };

  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", claims.sub)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return { ok: false, message: "Admin access required" };
  return { ok: true, userId: claims.sub };
}

async function findUserIdByEmail(supabaseUrl: string, serviceRoleKey: string, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!resp.ok) break;
    const payload = await resp.json();
    const users = payload?.users ?? [];
    const hit = users.find((u: { email?: string }) => (u.email || "").toLowerCase() === normalized);
    if (hit?.id) return hit.id as string;
    if (!users.length) break;
  }
  return null;
}

async function findUserEmailById(supabaseUrl: string, serviceRoleKey: string, userId: string): Promise<string | null> {
  for (let page = 1; page <= 20; page += 1) {
    const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!resp.ok) break;
    const payload = await resp.json();
    const users = payload?.users ?? [];
    const hit = users.find((u: { id?: string; email?: string }) => u.id === userId);
    if (hit?.email) return String(hit.email).toLowerCase();
    if (!users.length) break;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "admin-control", {
    ip: { limit: 30, windowMs: 60_000 },
    user: { limit: 60, windowMs: 60_000 },
    session: { limit: 60, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("admin-control", rl.scope!, rl.ctx, corsHeaders);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const adminCheck = await ensureAdmin(req, supabaseAdmin);
  if (!adminCheck.ok) {
    logRequest({ function_name: "admin-control", event_type: "unauthorized", status_code: 403, ctx: rl.ctx, message: adminCheck.message });
    return new Response(JSON.stringify({ error: adminCheck.message }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "grant_admin") {
      const email = String(body?.email || "").trim().toLowerCase();
      if (!validEmail(email)) {
        return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const userId = await findUserIdByEmail(supabaseUrl, serviceRoleKey, email);
      if (!userId) {
        return new Response(JSON.stringify({ error: "User not found by email" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
      logRequest({ function_name: "admin-control", event_type: "success", status_code: 200, ctx: rl.ctx, user_id: adminCheck.userId, message: `grant_admin:${userId}` });
      return new Response(JSON.stringify({ ok: true, user_id: userId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "set_plan") {
      const userId = body?.user_id;
      const plan = String(body?.plan || "").toLowerCase();
      if (!isUuid(userId)) {
        return new Response(JSON.stringify({ error: "Valid user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!validPlan(plan)) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const now = new Date();
      const limits = await fetchBillingPlan(supabaseAdmin, plan);
      if (!limits) {
        return new Response(JSON.stringify({ error: "Plan config missing in billing catalog" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const update: Record<string, unknown> = {
        plan,
        chats_limit: limits.chats_limit,
        leads_limit: limits.leads_limit,
        widget_sites_limit: limits.widget_sites_limit,
        updated_at: now.toISOString(),
      };
      if (plan === "free") {
        update.billing_expires_at = null;
        update.grace_expires_at = null;
      } else {
        update.subscription_started_at = now.toISOString();
        update.chats_period_started_at = now.toISOString();
        update.billing_expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        update.grace_expires_at = new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000).toISOString();
      }
      const { error } = await supabaseAdmin.from("profiles").update(update).eq("user_id", userId);
      if (error) throw error;
      logRequest({ function_name: "admin-control", event_type: "success", status_code: 200, ctx: rl.ctx, user_id: adminCheck.userId, message: `set_plan:${userId}:${plan}` });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "bulk_manage_users") {
      const bulkAction = String(body?.bulk_action || "");
      const userIds = Array.isArray(body?.user_ids) ? body.user_ids : [];
      const rawPlan = String(body?.plan || "").toLowerCase();

      if (!["set_plan", "reset_usage", "suspend_user", "reactivate_user"].includes(bulkAction)) {
        return new Response(JSON.stringify({ error: "Invalid bulk_action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!userIds.length) {
        return new Response(JSON.stringify({ error: "user_ids is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (userIds.length > 200) {
        return new Response(JSON.stringify({ error: "Maximum 200 user_ids per request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (userIds.some((id: unknown) => !isUuid(id))) {
        return new Response(JSON.stringify({ error: "All user_ids must be valid UUIDs" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (bulkAction === "set_plan" && !validPlan(rawPlan)) {
        return new Response(JSON.stringify({ error: "Valid plan required for set_plan bulk action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const results: Array<{ user_id: string; ok: boolean; error?: string }> = [];
      const nowIso = new Date().toISOString();

      for (const userId of userIds as string[]) {
        try {
          if (bulkAction === "set_plan") {
            const limits = await fetchBillingPlan(supabaseAdmin, rawPlan);
            if (!limits) {
              throw new Error("Plan config missing in billing catalog");
            }
            const update: Record<string, unknown> = {
              plan: rawPlan,
              chats_limit: limits.chats_limit,
              leads_limit: limits.leads_limit,
              widget_sites_limit: limits.widget_sites_limit,
              updated_at: nowIso,
            };
            if (rawPlan === "free") {
              update.billing_expires_at = null;
              update.grace_expires_at = null;
            } else {
              const now = new Date();
              update.subscription_started_at = now.toISOString();
              update.chats_period_started_at = now.toISOString();
              update.billing_expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
              update.grace_expires_at = new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000).toISOString();
            }
            const { error } = await supabaseAdmin.from("profiles").update(update).eq("user_id", userId);
            if (error) throw error;
          } else if (bulkAction === "reset_usage") {
            const { error } = await supabaseAdmin
              .from("profiles")
              .update({ chats_used: 0, leads_used: 0, chats_period_started_at: nowIso, updated_at: nowIso })
              .eq("user_id", userId);
            if (error) throw error;
          } else if (bulkAction === "suspend_user") {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
            if (error) throw error;
          } else if (bulkAction === "reactivate_user") {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
            if (error) throw error;
          }
          results.push({ user_id: userId, ok: true });
        } catch (e) {
          results.push({ user_id: userId, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      const successCount = results.filter((r) => r.ok).length;
      const failureCount = results.length - successCount;
      logRequest({
        function_name: "admin-control",
        event_type: failureCount === 0 ? "success" : "error",
        status_code: failureCount === 0 ? 200 : 207,
        ctx: rl.ctx,
        user_id: adminCheck.userId,
        message: `bulk_manage_users:${bulkAction}:ok=${successCount}:fail=${failureCount}`,
      });
      return new Response(JSON.stringify({ ok: failureCount === 0, success_count: successCount, failure_count: failureCount, results }), {
        status: failureCount === 0 ? 200 : 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_usage") {
      const userId = body?.user_id;
      if (!isUuid(userId)) {
        return new Response(JSON.stringify({ error: "Valid user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ chats_used: 0, leads_used: 0, chats_period_started_at: now, updated_at: now })
        .eq("user_id", userId);
      if (error) throw error;
      logRequest({ function_name: "admin-control", event_type: "success", status_code: 200, ctx: rl.ctx, user_id: adminCheck.userId, message: `reset_usage:${userId}` });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "suspend_user") {
      const userId = body?.user_id;
      if (!isUuid(userId)) {
        return new Response(JSON.stringify({ error: "Valid user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (error) throw error;
      logRequest({ function_name: "admin-control", event_type: "success", status_code: 200, ctx: rl.ctx, user_id: adminCheck.userId, message: `suspend_user:${userId}` });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reactivate_user") {
      const userId = body?.user_id;
      if (!isUuid(userId)) {
        return new Response(JSON.stringify({ error: "Valid user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) throw error;
      logRequest({ function_name: "admin-control", event_type: "success", status_code: 200, ctx: rl.ctx, user_id: adminCheck.userId, message: `reactivate_user:${userId}` });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "impersonate_user") {
      const userId = body?.user_id;
      const emailInput = String(body?.email || "").trim().toLowerCase();
      if (!isUuid(userId)) {
        return new Response(JSON.stringify({ error: "Valid user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const resolvedEmail = await findUserEmailById(supabaseUrl, serviceRoleKey, userId);
      if (!resolvedEmail) {
        return new Response(JSON.stringify({ error: "User email could not be resolved for this user_id" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (emailInput && !validEmail(emailInput)) {
        return new Response(JSON.stringify({ error: "If provided, email must be valid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (emailInput && emailInput !== resolvedEmail) {
        return new Response(JSON.stringify({ error: "Provided email does not match the selected user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: resolvedEmail,
        options: {
          redirectTo: `${Deno.env.get("APP_SITE_URL") || "https://mobiwaveai.co.ke"}/dashboard`,
        },
      });
      if (error) throw error;
      const targetUser = data?.user;
      if (!targetUser || targetUser.id !== userId) {
        return new Response(JSON.stringify({ error: "Unable to generate impersonation link for selected user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      logRequest({ function_name: "admin-control", event_type: "success", status_code: 200, ctx: rl.ctx, user_id: adminCheck.userId, message: `impersonate_user:${userId}` });
      return new Response(JSON.stringify({ ok: true, action_link: data?.properties?.action_link ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "run_paystack_fallback") {
      const minutes = Number(body?.minutes ?? 10);
      const fallbackToken = Deno.env.get("PAYSTACK_FALLBACK_TOKEN");
      if (!fallbackToken) {
        return new Response(JSON.stringify({ error: "Fallback token not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const resp = await fetch(`${supabaseUrl}/functions/v1/paystack-fallback-activator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fallback-token": fallbackToken,
          Authorization: `Bearer ${fallbackToken}`,
        },
        body: JSON.stringify({ minutes: Number.isFinite(minutes) ? minutes : 10 }),
      });
      const data = await resp.json().catch(() => ({}));
      logRequest({ function_name: "admin-control", event_type: resp.ok ? "success" : "error", status_code: resp.status, ctx: rl.ctx, user_id: adminCheck.userId, message: "run_paystack_fallback" });
      return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, data }), {
        status: resp.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-control error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
