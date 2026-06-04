import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  Lock,
  Users,
  CreditCard,
  RefreshCw,
  Download,
  UserX,
  UserCheck,
  UserRoundCog,
  Sparkles,
  Clock3,
  Shield,
  BarChart3,
  Search,
  FileSpreadsheet,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

type LogRow = { id: string; created_at: string; function_name: string; event_type: string; status_code: number | null; ip: string | null; user_id: string | null; message: string | null; };
type UserRoleRow = { id: string; user_id: string; role: "admin" | "user"; created_at: string; };
type Plan = "free" | "growth" | "premium" | "enterprise";
type ProfileRow = { user_id: string; business_name: string; plan: Plan; chats_used: number; chats_limit: number; leads_used: number; leads_limit: number; widget_sites_limit: number; billing_expires_at: string | null; trial_expires_at: string | null; };
type WidgetAnalyticsRow = { id: string; business_id: string; event: string; page_url: string | null; page_title: string | null; created_at: string; };
type BillingEventRow = { id: string; created_at: string; provider: string; event_type: string; event_id: string | null; amount_cents: number | null; currency: string | null; user_id: string | null; };

const eventColor: Record<string, string> = {
  rate_limited: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  error: "bg-destructive/15 text-destructive border-destructive/20",
  unauthorized: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
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
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

async function callAdminControl(action: string, payload: Record<string, unknown> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No active session");
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-control`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Admin action failed");
  return data;
}

const statAccent: Record<string, string> = {
  cyan: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20",
  violet: "text-violet-600 bg-violet-500/10 border-violet-500/20",
  blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  red: "text-rose-600 bg-rose-500/10 border-rose-500/20",
  amber: "text-amber-600 bg-amber-500/10 border-amber-500/20",
};

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [roleRows, setRoleRows] = useState<UserRoleRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [billingEvents, setBillingEvents] = useState<BillingEventRow[]>([]);
  const [widgetDomainCountByUser, setWidgetDomainCountByUser] = useState<Record<string, number>>({});
  const [widgetAnalytics, setWidgetAnalytics] = useState<WidgetAnalyticsRow[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [eventFilter, setEventFilter] = useState<"all" | "rate_limited" | "error" | "unauthorized">("all");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [focusedUserId, setFocusedUserId] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [targetPlan, setTargetPlan] = useState<Plan>("growth");
  const [fallbackMinutes, setFallbackMinutes] = useState("10");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setIsRefreshing(true);
    try {
      const [{ data: roles }, { data: logsData }, { data: profileData }, { data: billingData }, { data: widgetDomains }, { data: analyticsData }] = await Promise.all([
        supabase.from("user_roles").select("id, user_id, role, created_at").order("created_at", { ascending: false }).limit(1000),
        (eventFilter === "all" ? supabase.from("request_logs").select("*") : supabase.from("request_logs").select("*").eq("event_type", eventFilter)).order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("user_id, business_name, plan, chats_used, chats_limit, leads_used, leads_limit, widget_sites_limit, billing_expires_at, trial_expires_at").order("updated_at", { ascending: false }).limit(1000),
        supabase.from("billing_events").select("id, created_at, provider, event_type, event_id, amount_cents, currency, user_id").order("created_at", { ascending: false }).limit(1000),
        supabase.from("widget_domains").select("user_id, is_active").eq("is_active", true).limit(5000),
        supabase.from("widget_analytics").select("id, business_id, event, page_url, page_title, created_at").order("created_at", { ascending: false }).limit(500),
      ]);
      setRoleRows((roles ?? []) as UserRoleRow[]);
      setLogs((logsData ?? []) as LogRow[]);
      setProfiles((profileData ?? []) as ProfileRow[]);
      setBillingEvents((billingData ?? []) as BillingEventRow[]);
      setWidgetAnalytics((analyticsData ?? []) as WidgetAnalyticsRow[]);
      const counts: Record<string, number> = {};
      (widgetDomains ?? []).forEach((d: { user_id?: string | null }) => { if (d.user_id) counts[d.user_id] = (counts[d.user_id] ?? 0) + 1; });
      setWidgetDomainCountByUser(counts);
      setLastSyncedAt(new Date());
    } finally { setIsRefreshing(false); }
  }, [isAdmin, eventFilter]);

  useEffect(() => { if (!isAdmin) return; void loadAll(); const interval = setInterval(() => void loadAll(), 20_000); return () => clearInterval(interval); }, [isAdmin, loadAll]);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusyAction(key); setStatusMsg("");
    try { await fn(); setStatusMsg("Action completed successfully."); await loadAll(); }
    catch (e) { setStatusMsg(e instanceof Error ? e.message : "Action failed"); }
    finally { setBusyAction(null); }
  };

  const filteredProfiles = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => p.user_id.toLowerCase().includes(q) || (p.business_name || "").toLowerCase().includes(q) || p.plan.toLowerCase().includes(q));
  }, [profiles, userQuery]);

  useEffect(() => { if (filteredProfiles.length && !focusedUserId) setFocusedUserId(filteredProfiles[0].user_id); }, [filteredProfiles, focusedUserId]);

  const focusedProfile = useMemo(() => profiles.find((p) => p.user_id === focusedUserId) ?? null, [profiles, focusedUserId]);

  const accountStatus = (p: ProfileRow): "active" | "expired" | "inactive" => {
    if (p.plan === "free") { if (p.trial_expires_at && new Date(p.trial_expires_at).getTime() < Date.now()) return "expired"; return "active"; }
    if (p.billing_expires_at && new Date(p.billing_expires_at).getTime() < Date.now()) return "expired";
    if (p.chats_used >= p.chats_limit && p.leads_used >= p.leads_limit) return "inactive";
    return "active";
  };

  const adminsSet = useMemo(() => new Set(roleRows.filter((r) => r.role === "admin").map((r) => r.user_id)), [roleRows]);

  const stats = useMemo(() => {
    const admins = adminsSet.size;
    const uniqueUsers = new Set(profiles.map((p) => p.user_id)).size;
    const event24h = logs.filter((l) => Date.now() - new Date(l.created_at).getTime() <= 24 * 3600 * 1000);
    const errors24h = event24h.filter((e) => e.event_type === "error").length;
    const rate24h = event24h.filter((e) => e.event_type === "rate_limited").length;
    const activePaid = profiles.filter((p) => p.plan !== "free").length;
    return { admins, uniqueUsers, event24h: event24h.length, errors24h, rate24h, activePaid };
  }, [adminsSet, logs, profiles]);

  const planDistribution = useMemo(() => {
    const acc: Record<Plan, number> = { free: 0, growth: 0, premium: 0, enterprise: 0 };
    profiles.forEach((p) => { acc[p.plan] += 1; });
    return acc;
  }, [profiles]);

  const eventsByFunction = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => { map.set(l.function_name, (map.get(l.function_name) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [logs]);

  const billingSummary = useMemo(() => {
    let capturedCents = 0; let refundsCents = 0;
    billingEvents.forEach((e) => {
      const amount = e.amount_cents ?? 0;
      const event = (e.event_type || "").toLowerCase();
      if (event.includes("charge") || event.includes("success") || event.includes("paid")) capturedCents += amount;
      if (event.includes("refund")) refundsCents += amount;
    });
    return { capturedCents, refundsCents, netCents: capturedCents - refundsCents };
  }, [billingEvents]);

  const toggleUserSelection = (userId: string) => { setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId])); };
  const selectVisibleUsers = () => { setSelectedUserIds((prev) => { const set = new Set(prev); filteredProfiles.forEach((p) => set.add(p.user_id)); return [...set]; }); };
  const clearSelection = () => setSelectedUserIds([]);

  const runBulkAction = async (action: "suspend_user" | "reactivate_user" | "reset_usage" | "set_plan") => {
    if (!selectedUserIds.length) { setStatusMsg("Select at least one user first."); return; }
    await runAction(`bulk_${action}`, async () => {
      const response = await callAdminControl("bulk_manage_users", { bulk_action: action, user_ids: selectedUserIds, ...(action === "set_plan" ? { plan: targetPlan } : {}) });
      const okCount = Number(response?.success_count ?? 0);
      const failCount = Number(response?.failure_count ?? 0);
      setStatusMsg(failCount > 0 ? `Bulk action finished with partial failures: ${okCount} succeeded, ${failCount} failed.` : `Bulk action complete: ${action} for ${okCount} users.`);
    });
  };

  if (roleLoading) return <div className="p-6 text-sm text-muted-foreground">Checking access...</div>;
  if (!isAdmin) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Admins only</CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">You don't have admin access.</p></CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-emerald-950 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Operations Control Center
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">Admin Intelligence Console</h1>
              <p className="mt-1 text-sm text-cyan-100/80">Analytics, user operations, billing controls, and exportable reports in one place.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-cyan-100">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {lastSyncedAt ? `Last sync ${lastSyncedAt.toLocaleTimeString()}` : "Syncing..."}
                </span>
              </div>
              <Button variant="secondary" className="border-white/20 bg-white/15 text-white hover:bg-white/25" onClick={() => void loadAll()} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          { icon: Users, label: "Tracked Users", value: stats.uniqueUsers, accent: "cyan" },
          { icon: ShieldAlert, label: "Admins", value: stats.admins, accent: "violet" },
          { icon: CreditCard, label: "Paid Accounts", value: stats.activePaid, accent: "blue" },
          { icon: Activity, label: "Events 24h", value: stats.event24h, accent: "blue" },
          { icon: AlertTriangle, label: "Errors 24h", value: stats.errors24h, accent: "red" },
          { icon: RefreshCw, label: "Rate Limits 24h", value: stats.rate24h, accent: "amber" },
        ].map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:shadow-sm"><BarChart3 className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg data-[state=active]:shadow-sm"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:shadow-sm"><Shield className="mr-2 h-4 w-4" />Bulk Actions</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg data-[state=active]:shadow-sm"><CreditCard className="mr-2 h-4 w-4" />Billing</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg data-[state=active]:shadow-sm"><FileSpreadsheet className="mr-2 h-4 w-4" />Reports</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:shadow-sm"><LineChart className="mr-2 h-4 w-4" />Widget Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border/50 shadow-sm">
              <CardHeader><CardTitle>Plan Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(Object.keys(planDistribution) as Plan[]).map((plan) => (
                  <div key={plan} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-sm">
                    <span className="capitalize font-medium">{plan}</span>
                    <Badge variant="secondary">{planDistribution[plan]}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardHeader><CardTitle>Event Heatmap (Top Functions)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {eventsByFunction.length ? eventsByFunction.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{name}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No event data yet.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>User Directory</CardTitle>
              <div className="flex w-full max-w-lg items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search by user id, business, or plan" className="border-border/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-12">
                <div className="xl:col-span-7">
                  <div className="overflow-x-auto rounded-xl border border-border/50 bg-muted/10">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="p-3 text-left font-semibold">Select</th>
                          <th className="p-3 text-left font-semibold">User</th>
                          <th className="p-3 text-left font-semibold">Business</th>
                          <th className="p-3 text-left font-semibold">Plan</th>
                          <th className="p-3 text-left font-semibold">Status</th>
                          <th className="p-3 text-left font-semibold">Usage</th>
                          <th className="p-3 text-left font-semibold">Embeds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProfiles.map((p) => {
                          const selected = selectedUserIds.includes(p.user_id);
                          const focused = focusedUserId === p.user_id;
                          return (
                            <tr key={p.user_id}
                              className={`cursor-pointer border-b border-border/30 last:border-0 transition-colors ${focused ? "bg-primary/5" : "hover:bg-muted/30"}`}
                              onClick={() => { setFocusedUserId(p.user_id); setTargetUserId(p.user_id); }}
                            >
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selected} onChange={() => toggleUserSelection(p.user_id)} className="rounded border-border" />
                              </td>
                              <td className="p-3 font-mono text-xs">{p.user_id.slice(0, 8)}&hellip;</td>
                              <td className="p-3 text-xs">{p.business_name || <span className="italic">-</span>}</td>
                              <td className="p-3"><Badge variant="secondary" className="capitalize">{p.plan}</Badge></td>
                              <td className="p-3">
                                <Badge variant="outline" className={`capitalize ${
                                  accountStatus(p) === "expired" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                  accountStatus(p) === "inactive" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                }`}>
                                  {accountStatus(p)}
                                </Badge>
                              </td>
                              <td className="p-3 text-xs">{p.chats_used}/{p.chats_limit} chats</td>
                              <td className="p-3 text-xs">{widgetDomainCountByUser[p.user_id] ?? 0}/{p.widget_sites_limit}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="xl:col-span-5">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader><CardTitle>User Detail &amp; Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {!focusedProfile ? (
                        <p className="text-sm text-muted-foreground">Select a user to inspect and manage.</p>
                      ) : (
                        <>
                          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-xs space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono ml-1">{focusedProfile.user_id.slice(0, 12)}&hellip;</span></div>
                              <div><span className="text-muted-foreground">Admin:</span> <span className="ml-1">{adminsSet.has(focusedProfile.user_id) ? "Yes" : "No"}</span></div>
                              <div><span className="text-muted-foreground">Business:</span> <span className="ml-1">{focusedProfile.business_name || "-"}</span></div>
                              <div><span className="text-muted-foreground">Plan:</span> <Badge variant="secondary" className="ml-1 capitalize text-[10px]">{focusedProfile.plan}</Badge></div>
                              <div><span className="text-muted-foreground">Status:</span> <span className={`ml-1 capitalize font-medium ${
                                accountStatus(focusedProfile) === "active" ? "text-emerald-600" : "text-red-600"
                              }`}>{accountStatus(focusedProfile)}</span></div>
                              <div><span className="text-muted-foreground">Widget Sites:</span> <span className="ml-1">{widgetDomainCountByUser[focusedProfile.user_id] ?? 0}/{focusedProfile.widget_sites_limit}</span></div>
                            </div>
                            <div className="border-t border-border/30 pt-2 grid grid-cols-2 gap-1">
                              <div><span className="text-muted-foreground">Chats:</span> <span className="ml-1">{focusedProfile.chats_used}/{focusedProfile.chats_limit}</span></div>
                              <div><span className="text-muted-foreground">Leads:</span> <span className="ml-1">{focusedProfile.leads_used}/{focusedProfile.leads_limit}</span></div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="User email (required for login-as-user)" className="border-border/50" />
                            <div className="grid gap-2 md:grid-cols-2">
                              <Button variant="outline" disabled={busyAction === "suspend_user"} onClick={() => runAction("suspend_user", async () => { await callAdminControl("suspend_user", { user_id: focusedProfile.user_id }); })}>
                                <UserX className="mr-2 h-4 w-4" />Suspend
                              </Button>
                              <Button variant="outline" disabled={busyAction === "reactivate_user"} onClick={() => runAction("reactivate_user", async () => { await callAdminControl("reactivate_user", { user_id: focusedProfile.user_id }); })}>
                                <UserCheck className="mr-2 h-4 w-4" />Reactivate
                              </Button>
                              <Button variant="outline" disabled={busyAction === "reset_usage"} onClick={() => runAction("reset_usage", async () => { await callAdminControl("reset_usage", { user_id: focusedProfile.user_id }); })}>
                                Reset Usage
                              </Button>
                              <Button disabled={busyAction === "impersonate_user"} onClick={() => runAction("impersonate_user", async () => {
                                const result = await callAdminControl("impersonate_user", { user_id: focusedProfile.user_id, email: targetEmail.trim() || undefined });
                                if (result?.action_link) window.open(result.action_link as string, "_blank", "noopener,noreferrer");
                                else throw new Error("Impersonation link not generated");
                              })}>
                                <UserRoundCog className="mr-2 h-4 w-4" />Login As User
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>Bulk User Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectVisibleUsers}>Select Visible Users</Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>Clear Selection</Button>
                <Badge variant="secondary">{selectedUserIds.length} selected</Badge>
              </div>

              <div className="grid gap-2 md:grid-cols-[160px_repeat(4,minmax(0,1fr))]">
                <select value={targetPlan} onChange={(e) => setTargetPlan(e.target.value as Plan)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="free">free</option>
                  <option value="growth">growth</option>
                  <option value="premium">premium</option>
                  <option value="enterprise">enterprise</option>
                </select>
                <Button disabled={busyAction === "bulk_set_plan"} onClick={() => void runBulkAction("set_plan")}>Set Plan (Bulk)</Button>
                <Button variant="outline" disabled={busyAction === "bulk_reset_usage"} onClick={() => void runBulkAction("reset_usage")}>Reset Usage (Bulk)</Button>
                <Button variant="outline" disabled={busyAction === "bulk_suspend_user"} onClick={() => void runBulkAction("suspend_user")}><UserX className="mr-2 h-4 w-4" />Suspend</Button>
                <Button variant="outline" disabled={busyAction === "bulk_reactivate_user"} onClick={() => void runBulkAction("reactivate_user")}><UserCheck className="mr-2 h-4 w-4" />Reactivate</Button>
              </div>

              <Button variant="outline" onClick={() => exportCsv(`selected-users-${new Date().toISOString().slice(0, 10)}.csv`, ["user_id", "business_name", "plan", "chats_used", "chats_limit", "leads_used", "leads_limit"], profiles.filter((p) => selectedUserIds.includes(p.user_id)).map((p) => [p.user_id, p.business_name, p.plan, p.chats_used, p.chats_limit, p.leads_used, p.leads_limit]))}>
                <Download className="mr-2 h-4 w-4" />Export Selected Users
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>Admin Access &amp; Recovery Tools</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Grant admin by email" className="border-border/50" />
                <Button disabled={busyAction === "grant_admin" || !adminEmail.trim()} onClick={() => runAction("grant_admin", async () => { await callAdminControl("grant_admin", { email: adminEmail.trim() }); })}>
                  Grant Admin
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-[120px_1fr]">
                <Input value={fallbackMinutes} onChange={(e) => setFallbackMinutes(e.target.value)} placeholder="Minutes" className="border-border/50" />
                <Button variant="secondary" disabled={busyAction === "run_fallback"} onClick={() => runAction("run_fallback", async () => { await callAdminControl("run_paystack_fallback", { minutes: Number(fallbackMinutes || "10") }); })}>
                  Run Paystack Fallback Activator
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={CreditCard} label="Captured" value={Math.round(billingSummary.capturedCents / 100)} accent="blue" />
            <StatCard icon={AlertTriangle} label="Refunded" value={Math.round(billingSummary.refundsCents / 100)} accent="amber" />
            <StatCard icon={Activity} label="Net" value={Math.round(billingSummary.netCents / 100)} accent="cyan" />
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Billing Events</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportCsv(`billing-events-${new Date().toISOString().slice(0, 10)}.csv`, ["created_at", "provider", "event_type", "event_id", "amount_cents", "currency", "user_id"], billingEvents.map((e) => [e.created_at, e.provider, e.event_type, e.event_id, e.amount_cents, e.currency, e.user_id]))}>
                <Download className="mr-2 h-4 w-4" />CSV
              </Button>
            </CardHeader>
            <CardContent>
              <SimpleTable
                columns={["Time", "Provider", "Event", "Amount", "User"]}
                rows={billingEvents.map((e) => [new Date(e.created_at).toLocaleString(), e.provider, e.event_type, e.amount_cents ? `${(e.amount_cents / 100).toLocaleString()} ${e.currency ?? ""}` : "-", e.user_id ? `${e.user_id.slice(0, 8)}…` : "-"])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>System Events</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={eventFilter} onValueChange={(v) => setEventFilter(v as typeof eventFilter)}>
                  <TabsList className="bg-muted/30 rounded-lg">
                    <TabsTrigger value="all" className="rounded-md text-xs">All</TabsTrigger>
                    <TabsTrigger value="rate_limited" className="rounded-md text-xs">Rate-limited</TabsTrigger>
                    <TabsTrigger value="error" className="rounded-md text-xs">Errors</TabsTrigger>
                    <TabsTrigger value="unauthorized" className="rounded-md text-xs">Unauthorized</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline" size="sm" onClick={() => exportCsv(`system-events-${new Date().toISOString().slice(0, 10)}.csv`, ["created_at", "function_name", "event_type", "status_code", "ip", "user_id", "message"], logs.map((l) => [l.created_at, l.function_name, l.event_type, l.status_code, l.ip, l.user_id, l.message]))}>
                  <Download className="mr-2 h-4 w-4" />CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border/50 bg-muted/20">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border/50 bg-muted/40">
                      <th className="p-3 text-left font-semibold">Time</th>
                      <th className="p-3 text-left font-semibold">Function</th>
                      <th className="p-3 text-left font-semibold">Event</th>
                      <th className="p-3 text-left font-semibold">IP</th>
                      <th className="p-3 text-left font-semibold">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="p-3 font-mono text-xs">{l.function_name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={(eventColor[l.event_type] ?? "bg-muted text-muted-foreground") + " text-[10px]"}>{l.event_type}</Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">{l.ip ?? "-"}</td>
                        <td className="max-w-[360px] truncate p-3 text-xs text-muted-foreground">{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle>Profile Export</CardTitle></CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => exportCsv(`profiles-${new Date().toISOString().slice(0, 10)}.csv`, ["user_id", "business_name", "plan", "status", "chats_used", "chats_limit", "leads_used", "leads_limit", "widget_sites_used", "widget_sites_limit", "billing_expires_at", "trial_expires_at"], profiles.map((p) => [p.user_id, p.business_name, p.plan, accountStatus(p), p.chats_used, p.chats_limit, p.leads_used, p.leads_limit, widgetDomainCountByUser[p.user_id] ?? 0, p.widget_sites_limit, p.billing_expires_at, p.trial_expires_at]))}>
                <Download className="mr-2 h-4 w-4" />Export Profiles CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Activity} label="Total Events" value={widgetAnalytics.length} accent="blue" />
            <StatCard icon={Users} label="Unique Businesses" value={new Set(widgetAnalytics.map((a) => a.business_id)).size} accent="violet" />
            <StatCard icon={BarChart3} label="Page Views" value={widgetAnalytics.filter((a) => a.event === "page_viewed").length} accent="cyan" />
            <StatCard icon={Sparkles} label="Messages Sent" value={widgetAnalytics.filter((a) => a.event === "message_sent").length} accent="amber" />
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-0"><CardTitle>Event Breakdown</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {["page_viewed", "conversation_started", "widget_opened", "widget_closed", "message_sent"].map((evt) => {
                  const count = widgetAnalytics.filter((a) => a.event === evt).length;
                  const total = widgetAnalytics.length || 1;
                  return (
                    <div key={evt} className="flex items-center gap-3">
                      <span className="w-40 text-sm capitalize">{evt.replace(/_/g, " ")}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="w-16 text-right text-sm text-muted-foreground font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-0"><CardTitle>Recent Events</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <SimpleTable
                columns={["Time", "Business", "Event", "Page"]}
                rows={widgetAnalytics.slice(0, 50).map((a) => [new Date(a.created_at).toLocaleString(), a.business_id.slice(0, 8) + "\u2026", a.event, a.page_title || a.page_url || "\u2014"])}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {statusMsg && (
        <div className="rounded-xl border border-border/50 bg-muted/40 px-4 py-3 text-xs text-muted-foreground shadow-sm">{statusMsg}</div>
      )}
    </motion.div>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-4">No data.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50 bg-muted/20">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border/50 bg-muted/40">
            {columns.map((c) => <th key={c} className="p-3 text-left font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
              {r.map((c, j) => <td key={j} className="p-3 text-xs">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: "cyan" | "violet" | "blue" | "red" | "amber" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/50 shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
        <CardContent className="flex items-center gap-3 p-4">
          <div className={`rounded-lg border p-2.5 ${statAccent[accent]} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold tracking-tight">{value.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
