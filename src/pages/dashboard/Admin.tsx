import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, AlertTriangle, Activity, Lock, Users, CreditCard, RefreshCw, Wrench, Download, UserX, UserCheck, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LogRow = {
  id: string;
  created_at: string;
  function_name: string;
  event_type: string;
  status_code: number | null;
  ip: string | null;
  user_id: string | null;
  message: string | null;
};

type UserRoleRow = {
  id: string;
  user_id: string;
  role: "admin" | "user";
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  business_name: string;
  plan: string;
  chats_used: number;
  chats_limit: number;
  leads_used: number;
  leads_limit: number;
  billing_expires_at: string | null;
  trial_expires_at: string | null;
};

type BillingEventRow = {
  id: string;
  created_at: string;
  provider: string;
  event_type: string;
  event_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  user_id: string | null;
};

const eventColor: Record<string, string> = {
  rate_limited: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  error: "bg-destructive/15 text-destructive",
  unauthorized: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCsv(name: string, headers: string[], rows: Array<Array<string | number | null>>) {
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const csv = `${headers.join(",")}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function callAdminControl(action: string, payload: Record<string, unknown> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No active session");

  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-control`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Admin action failed");
  return data;
}

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [roleRows, setRoleRows] = useState<UserRoleRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [billingEvents, setBillingEvents] = useState<BillingEventRow[]>([]);
  const [filter, setFilter] = useState<"all" | "rate_limited" | "error" | "unauthorized">("all");
  const [adminEmail, setAdminEmail] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [targetPlan, setTargetPlan] = useState("growth");
  const [fallbackMinutes, setFallbackMinutes] = useState("10");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const loadAll = async () => {
    if (!isAdmin) return;
    const [{ data: roles }, { data: logsData }, { data: profileData }, { data: billingData }] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, created_at").order("created_at", { ascending: false }).limit(500),
      (filter === "all"
        ? supabase.from("request_logs").select("*")
        : supabase.from("request_logs").select("*").eq("event_type", filter))
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("profiles")
        .select("user_id, business_name, plan, chats_used, chats_limit, leads_used, leads_limit, billing_expires_at, trial_expires_at")
        .order("updated_at", { ascending: false })
        .limit(400),
      supabase
        .from("billing_events")
        .select("id, created_at, provider, event_type, event_id, amount_cents, currency, user_id")
        .order("created_at", { ascending: false })
        .limit(400),
    ]);
    setRoleRows((roles ?? []) as UserRoleRow[]);
    setLogs((logsData ?? []) as LogRow[]);
    setProfiles((profileData ?? []) as ProfileRow[]);
    setBillingEvents((billingData ?? []) as BillingEventRow[]);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
    const interval = setInterval(loadAll, 20_000);
    return () => clearInterval(interval);
  }, [isAdmin, filter]);

  const stats = useMemo(() => {
    const admins = roleRows.filter((r) => r.role === "admin").length;
    const uniqueUsers = new Set(profiles.map((p) => p.user_id)).size;
    const event24h = logs.filter((l) => Date.now() - new Date(l.created_at).getTime() <= 24 * 3600 * 1000);
    const errors24h = event24h.filter((e) => e.event_type === "error").length;
    const rate24h = event24h.filter((e) => e.event_type === "rate_limited").length;
    return { admins, uniqueUsers, event24h: event24h.length, errors24h, rate24h };
  }, [roleRows, logs, profiles]);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusyAction(key);
    setStatusMsg("");
    try {
      await fn();
      setStatusMsg("Action completed successfully.");
      await loadAll();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyAction(null);
    }
  };

  if (roleLoading) return <div className="p-6 text-sm text-muted-foreground">Checking access...</div>;
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Admins only
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You don't have admin access.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Tracked users" value={stats.uniqueUsers} />
        <StatCard icon={ShieldAlert} label="Admin grants" value={stats.admins} tone="purple" />
        <StatCard icon={Activity} label="Events (24h)" value={stats.event24h} />
        <StatCard icon={AlertTriangle} label="Errors (24h)" value={stats.errors24h} tone="error" />
        <StatCard icon={RefreshCw} label="Rate-limits (24h)" value={stats.rate24h} tone="warn" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />Account Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Grant admin by email" />
            <Button
              disabled={busyAction === "grant_admin" || !adminEmail.trim()}
              onClick={() => runAction("grant_admin", async () => { await callAdminControl("grant_admin", { email: adminEmail.trim() }); })}
            >
              Grant Admin
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <Input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="Target user UUID" />
            <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="Target user email (for impersonation)" />
          </div>

          <div className="grid gap-2 md:grid-cols-[180px_auto_auto_auto_auto]">
            <select
              value={targetPlan}
              onChange={(e) => setTargetPlan(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="free">free</option>
              <option value="growth">growth</option>
              <option value="premium">premium</option>
              <option value="enterprise">enterprise</option>
            </select>
            <Button
              disabled={busyAction === "set_plan" || !targetUserId.trim()}
              onClick={() => runAction("set_plan", async () => { await callAdminControl("set_plan", { user_id: targetUserId.trim(), plan: targetPlan }); })}
            >
              Set Plan
            </Button>
            <Button
              variant="outline"
              disabled={busyAction === "reset_usage" || !targetUserId.trim()}
              onClick={() => runAction("reset_usage", async () => { await callAdminControl("reset_usage", { user_id: targetUserId.trim() }); })}
            >
              Reset Usage
            </Button>
            <Button
              variant="outline"
              disabled={busyAction === "suspend_user" || !targetUserId.trim()}
              onClick={() => runAction("suspend_user", async () => { await callAdminControl("suspend_user", { user_id: targetUserId.trim() }); })}
            >
              <UserX className="h-4 w-4 mr-2" />Suspend
            </Button>
            <Button
              variant="outline"
              disabled={busyAction === "reactivate_user" || !targetUserId.trim()}
              onClick={() => runAction("reactivate_user", async () => { await callAdminControl("reactivate_user", { user_id: targetUserId.trim() }); })}
            >
              <UserCheck className="h-4 w-4 mr-2" />Reactivate
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-[180px_auto_auto]">
            <Input value={fallbackMinutes} onChange={(e) => setFallbackMinutes(e.target.value)} placeholder="fallback minutes" />
            <Button
              variant="secondary"
              disabled={busyAction === "run_fallback"}
              onClick={() => runAction("run_fallback", async () => {
                await callAdminControl("run_paystack_fallback", { minutes: Number(fallbackMinutes || "10") });
              })}
            >
              Run Paystack Fallback Activator
            </Button>
            <Button
              variant="secondary"
              disabled={busyAction === "impersonate_user" || !targetUserId.trim() || !targetEmail.trim()}
              onClick={() => runAction("impersonate_user", async () => {
                const result = await callAdminControl("impersonate_user", { user_id: targetUserId.trim(), email: targetEmail.trim() });
                if (result?.action_link) window.open(result.action_link as string, "_blank", "noopener,noreferrer");
                else throw new Error("Impersonation link not generated");
              })}
            >
              <UserRoundCog className="h-4 w-4 mr-2" />Log In As User
            </Button>
          </div>
          {statusMsg && <p className="text-xs text-muted-foreground">{statusMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Billing Events</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(
              `billing-events-${new Date().toISOString().slice(0, 10)}.csv`,
              ["created_at", "provider", "event_type", "event_id", "amount_cents", "currency", "user_id"],
              billingEvents.map((e) => [e.created_at, e.provider, e.event_type, e.event_id, e.amount_cents, e.currency, e.user_id]),
            )}
          >
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table
            columns={["Time", "Provider", "Event", "Amount", "User"]}
            rows={billingEvents.map((e) => [
              new Date(e.created_at).toLocaleString(),
              e.provider,
              e.event_type,
              e.amount_cents ? `${(e.amount_cents / 100).toLocaleString()} ${e.currency ?? ""}` : "-",
              e.user_id ? e.user_id.slice(0, 8) : "-",
            ])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profiles and Quotas</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(
              `profiles-${new Date().toISOString().slice(0, 10)}.csv`,
              ["user_id", "business_name", "plan", "chats_used", "chats_limit", "leads_used", "leads_limit", "billing_expires_at", "trial_expires_at"],
              profiles.map((p) => [p.user_id, p.business_name, p.plan, p.chats_used, p.chats_limit, p.leads_used, p.leads_limit, p.billing_expires_at, p.trial_expires_at]),
            )}
          >
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table
            columns={["User", "Business", "Plan", "Chats", "Leads", "Expiry"]}
            rows={profiles.map((p) => [
              p.user_id.slice(0, 8),
              p.business_name || "-",
              p.plan,
              `${p.chats_used}/${p.chats_limit}`,
              `${p.leads_used}/${p.leads_limit}`,
              p.billing_expires_at ? new Date(p.billing_expires_at).toLocaleDateString() : (p.trial_expires_at ? `Trial: ${new Date(p.trial_expires_at).toLocaleDateString()}` : "-"),
            ])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>System Events</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="rate_limited">Rate-limited</TabsTrigger>
                <TabsTrigger value="error">Errors</TabsTrigger>
                <TabsTrigger value="unauthorized">Unauthorized</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(
                `system-events-${new Date().toISOString().slice(0, 10)}.csv`,
                ["created_at", "function_name", "event_type", "status_code", "ip", "user_id", "message"],
                logs.map((l) => [l.created_at, l.function_name, l.event_type, l.status_code, l.ip, l.user_id, l.message]),
              )}
            >
              <Download className="h-4 w-4 mr-2" />CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Function</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-left p-2">IP</th>
                  <th className="text-left p-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</td>
                    <td className="p-2 font-mono text-xs">{l.function_name}</td>
                    <td className="p-2">
                      <Badge className={eventColor[l.event_type] ?? ""} variant="secondary">{l.event_type}</Badge>
                    </td>
                    <td className="p-2 font-mono text-xs">{l.ip ?? "-"}</td>
                    <td className="p-2 text-xs text-muted-foreground max-w-[320px] truncate">{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            {columns.map((c) => <th key={c} className="text-left p-2">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((c, j) => <td key={j} className="p-2 text-xs">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone?: "warn" | "error" | "purple" }) {
  const toneCls =
    tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "error"
      ? "text-destructive"
      : tone === "purple"
      ? "text-purple-600 dark:text-purple-400"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${toneCls}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
