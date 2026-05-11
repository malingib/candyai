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
} from "lucide-react";
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

type Plan = "free" | "growth" | "premium" | "enterprise";

type ProfileRow = {
  user_id: string;
  business_name: string;
  plan: Plan;
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
  unauthorized: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
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
      const [{ data: roles }, { data: logsData }, { data: profileData }, { data: billingData }] = await Promise.all([
        supabase.from("user_roles").select("id, user_id, role, created_at").order("created_at", { ascending: false }).limit(1000),
        (eventFilter === "all"
          ? supabase.from("request_logs").select("*")
          : supabase.from("request_logs").select("*").eq("event_type", eventFilter))
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("profiles")
          .select("user_id, business_name, plan, chats_used, chats_limit, leads_used, leads_limit, billing_expires_at, trial_expires_at")
          .order("updated_at", { ascending: false })
          .limit(1000),
        supabase
          .from("billing_events")
          .select("id, created_at, provider, event_type, event_id, amount_cents, currency, user_id")
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      setRoleRows((roles ?? []) as UserRoleRow[]);
      setLogs((logsData ?? []) as LogRow[]);
      setProfiles((profileData ?? []) as ProfileRow[]);
      setBillingEvents((billingData ?? []) as BillingEventRow[]);
      setLastSyncedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [isAdmin, eventFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAll();
    const interval = setInterval(() => void loadAll(), 20_000);
    return () => clearInterval(interval);
  }, [isAdmin, loadAll]);

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

  const filteredProfiles = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      p.user_id.toLowerCase().includes(q) ||
      (p.business_name || "").toLowerCase().includes(q) ||
      p.plan.toLowerCase().includes(q),
    );
  }, [profiles, userQuery]);

  useEffect(() => {
    if (filteredProfiles.length && !focusedUserId) {
      setFocusedUserId(filteredProfiles[0].user_id);
    }
  }, [filteredProfiles, focusedUserId]);

  const focusedProfile = useMemo(() => profiles.find((p) => p.user_id === focusedUserId) ?? null, [profiles, focusedUserId]);

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
    profiles.forEach((p) => {
      acc[p.plan] += 1;
    });
    return acc;
  }, [profiles]);

  const eventsByFunction = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      map.set(l.function_name, (map.get(l.function_name) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [logs]);

  const billingSummary = useMemo(() => {
    let capturedCents = 0;
    let refundsCents = 0;
    billingEvents.forEach((e) => {
      const amount = e.amount_cents ?? 0;
      const event = (e.event_type || "").toLowerCase();
      if (event.includes("charge") || event.includes("success") || event.includes("paid")) capturedCents += amount;
      if (event.includes("refund")) refundsCents += amount;
    });
    return { capturedCents, refundsCents, netCents: capturedCents - refundsCents };
  }, [billingEvents]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]));
  };

  const selectVisibleUsers = () => {
    setSelectedUserIds((prev) => {
      const set = new Set(prev);
      filteredProfiles.forEach((p) => set.add(p.user_id));
      return [...set];
    });
  };

  const clearSelection = () => setSelectedUserIds([]);

  const runBulkAction = async (action: "suspend_user" | "reactivate_user" | "reset_usage" | "set_plan") => {
    if (!selectedUserIds.length) {
      setStatusMsg("Select at least one user first.");
      return;
    }
    await runAction(`bulk_${action}`, async () => {
      const response = await callAdminControl("bulk_manage_users", {
        bulk_action: action,
        user_ids: selectedUserIds,
        ...(action === "set_plan" ? { plan: targetPlan } : {}),
      });
      const okCount = Number(response?.success_count ?? 0);
      const failCount = Number(response?.failure_count ?? 0);
      setStatusMsg(
        failCount > 0
          ? `Bulk action finished with partial failures: ${okCount} succeeded, ${failCount} failed.`
          : `Bulk action complete: ${action} for ${okCount} users.`,
      );
    });
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
              <Button
                variant="secondary"
                className="border-white/20 bg-white/15 text-white hover:bg-white/25"
                onClick={() => void loadAll()}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={Users} label="Tracked Users" value={stats.uniqueUsers} accent="cyan" />
        <StatCard icon={ShieldAlert} label="Admins" value={stats.admins} accent="violet" />
        <StatCard icon={CreditCard} label="Paid Accounts" value={stats.activePaid} accent="blue" />
        <StatCard icon={Activity} label="Events 24h" value={stats.event24h} accent="blue" />
        <StatCard icon={AlertTriangle} label="Errors 24h" value={stats.errors24h} accent="red" />
        <StatCard icon={RefreshCw} label="Rate Limits 24h" value={stats.rate24h} accent="amber" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="overview"><BarChart3 className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="bulk"><Shield className="mr-2 h-4 w-4" />Bulk Actions</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="mr-2 h-4 w-4" />Billing</TabsTrigger>
          <TabsTrigger value="reports"><FileSpreadsheet className="mr-2 h-4 w-4" />Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Plan Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(Object.keys(planDistribution) as Plan[]).map((plan) => (
                  <div key={plan} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <span className="capitalize">{plan}</span>
                    <span className="font-semibold">{planDistribution[plan]}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Event Heatmap (Top Functions)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {eventsByFunction.length ? eventsByFunction.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{name}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No event data yet.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>User Directory</CardTitle>
              <div className="flex w-full max-w-lg items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search by user id, business, or plan" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-12">
                <div className="xl:col-span-7">
                  <div className="overflow-x-auto rounded-lg border bg-muted/10">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b bg-muted/30">
                          <th className="p-2 text-left">Select</th>
                          <th className="p-2 text-left">User</th>
                          <th className="p-2 text-left">Business</th>
                          <th className="p-2 text-left">Plan</th>
                          <th className="p-2 text-left">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProfiles.map((p) => {
                          const selected = selectedUserIds.includes(p.user_id);
                          const focused = focusedUserId === p.user_id;
                          return (
                            <tr
                              key={p.user_id}
                              className={`cursor-pointer border-b last:border-0 hover:bg-muted/30 ${focused ? "bg-primary/5" : ""}`}
                              onClick={() => {
                                setFocusedUserId(p.user_id);
                                setTargetUserId(p.user_id);
                              }}
                            >
                              <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selected} onChange={() => toggleUserSelection(p.user_id)} />
                              </td>
                              <td className="p-2 font-mono text-xs">{p.user_id.slice(0, 8)}…</td>
                              <td className="p-2 text-xs">{p.business_name || "-"}</td>
                              <td className="p-2"><Badge variant="secondary" className="capitalize">{p.plan}</Badge></td>
                              <td className="p-2 text-xs">{p.chats_used}/{p.chats_limit} chats</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="xl:col-span-5">
                  <Card className="border-border/70">
                    <CardHeader><CardTitle>User Detail & Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {!focusedProfile ? (
                        <p className="text-sm text-muted-foreground">Select a user to inspect and manage.</p>
                      ) : (
                        <>
                          <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-1">
                            <p><span className="text-muted-foreground">User ID:</span> <span className="font-mono">{focusedProfile.user_id}</span></p>
                            <p><span className="text-muted-foreground">Business:</span> {focusedProfile.business_name || "-"}</p>
                            <p><span className="text-muted-foreground">Plan:</span> <span className="capitalize">{focusedProfile.plan}</span></p>
                            <p><span className="text-muted-foreground">Admin:</span> {adminsSet.has(focusedProfile.user_id) ? "Yes" : "No"}</p>
                            <p><span className="text-muted-foreground">Chats:</span> {focusedProfile.chats_used}/{focusedProfile.chats_limit}</p>
                            <p><span className="text-muted-foreground">Leads:</span> {focusedProfile.leads_used}/{focusedProfile.leads_limit}</p>
                          </div>

                          <div className="grid gap-2">
                            <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="User email (required for login-as-user)" />
                            <div className="grid gap-2 md:grid-cols-2">
                              <Button
                                variant="outline"
                                disabled={busyAction === "suspend_user"}
                                onClick={() => runAction("suspend_user", async () => {
                                  await callAdminControl("suspend_user", { user_id: focusedProfile.user_id });
                                })}
                              >
                                <UserX className="mr-2 h-4 w-4" />Suspend
                              </Button>
                              <Button
                                variant="outline"
                                disabled={busyAction === "reactivate_user"}
                                onClick={() => runAction("reactivate_user", async () => {
                                  await callAdminControl("reactivate_user", { user_id: focusedProfile.user_id });
                                })}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />Reactivate
                              </Button>
                              <Button
                                variant="outline"
                                disabled={busyAction === "reset_usage"}
                                onClick={() => runAction("reset_usage", async () => {
                                  await callAdminControl("reset_usage", { user_id: focusedProfile.user_id });
                                })}
                              >
                                Reset Usage
                              </Button>
                              <Button
                                disabled={busyAction === "impersonate_user"}
                                onClick={() => runAction("impersonate_user", async () => {
                                  const result = await callAdminControl("impersonate_user", {
                                    user_id: focusedProfile.user_id,
                                    email: targetEmail.trim() || undefined,
                                  });
                                  if (result?.action_link) window.open(result.action_link as string, "_blank", "noopener,noreferrer");
                                  else throw new Error("Impersonation link not generated");
                                })}
                              >
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
          <Card>
            <CardHeader>
              <CardTitle>Bulk User Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectVisibleUsers}>Select Visible Users</Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>Clear Selection</Button>
                <Badge variant="secondary">{selectedUserIds.length} selected</Badge>
              </div>

              <div className="grid gap-2 md:grid-cols-[160px_repeat(4,minmax(0,1fr))]">
                <select
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value as Plan)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
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

              <Button
                variant="outline"
                onClick={() => exportCsv(
                  `selected-users-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["user_id", "business_name", "plan", "chats_used", "chats_limit", "leads_used", "leads_limit"],
                  profiles
                    .filter((p) => selectedUserIds.includes(p.user_id))
                    .map((p) => [p.user_id, p.business_name, p.plan, p.chats_used, p.chats_limit, p.leads_used, p.leads_limit]),
                )}
              >
                <Download className="mr-2 h-4 w-4" />Export Selected Users
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Admin Access & Recovery Tools</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Grant admin by email" />
                <Button
                  disabled={busyAction === "grant_admin" || !adminEmail.trim()}
                  onClick={() => runAction("grant_admin", async () => {
                    await callAdminControl("grant_admin", { email: adminEmail.trim() });
                  })}
                >
                  Grant Admin
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-[120px_1fr]">
                <Input value={fallbackMinutes} onChange={(e) => setFallbackMinutes(e.target.value)} placeholder="Minutes" />
                <Button
                  variant="secondary"
                  disabled={busyAction === "run_fallback"}
                  onClick={() => runAction("run_fallback", async () => {
                    await callAdminControl("run_paystack_fallback", { minutes: Number(fallbackMinutes || "10") });
                  })}
                >
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Billing Events</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv(
                  `billing-events-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["created_at", "provider", "event_type", "event_id", "amount_cents", "currency", "user_id"],
                  billingEvents.map((e) => [e.created_at, e.provider, e.event_type, e.event_id, e.amount_cents, e.currency, e.user_id]),
                )}
              >
                <Download className="mr-2 h-4 w-4" />CSV
              </Button>
            </CardHeader>
            <CardContent>
              <SimpleTable
                columns={["Time", "Provider", "Event", "Amount", "User"]}
                rows={billingEvents.map((e) => [
                  new Date(e.created_at).toLocaleString(),
                  e.provider,
                  e.event_type,
                  e.amount_cents ? `${(e.amount_cents / 100).toLocaleString()} ${e.currency ?? ""}` : "-",
                  e.user_id ? `${e.user_id.slice(0, 8)}…` : "-",
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>System Events</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={eventFilter} onValueChange={(v) => setEventFilter(v as typeof eventFilter)}>
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
                  <Download className="mr-2 h-4 w-4" />CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border bg-muted/20">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b bg-muted/40">
                      <th className="p-2 text-left">Time</th>
                      <th className="p-2 text-left">Function</th>
                      <th className="p-2 text-left">Event</th>
                      <th className="p-2 text-left">IP</th>
                      <th className="p-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="p-2 font-mono text-xs">{l.function_name}</td>
                        <td className="p-2">
                          <Badge className={eventColor[l.event_type] ?? ""} variant="secondary">{l.event_type}</Badge>
                        </td>
                        <td className="p-2 font-mono text-xs">{l.ip ?? "-"}</td>
                        <td className="max-w-[360px] truncate p-2 text-xs text-muted-foreground">{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Profile Export</CardTitle></CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => exportCsv(
                  `profiles-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["user_id", "business_name", "plan", "chats_used", "chats_limit", "leads_used", "leads_limit", "billing_expires_at", "trial_expires_at"],
                  profiles.map((p) => [p.user_id, p.business_name, p.plan, p.chats_used, p.chats_limit, p.leads_used, p.leads_limit, p.billing_expires_at, p.trial_expires_at]),
                )}
              >
                <Download className="mr-2 h-4 w-4" />Export Profiles CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {statusMsg && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{statusMsg}</div>
      )}
    </div>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-muted/20">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b bg-muted/40">
            {columns.map((c) => <th key={c} className="p-2 text-left">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
              {r.map((c, j) => <td key={j} className="p-2 text-xs">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: "cyan" | "violet" | "blue" | "red" | "amber" }) {
  const toneCls =
    accent === "cyan"
      ? "text-cyan-600 bg-cyan-500/10 border-cyan-500/20"
      : accent === "violet"
      ? "text-violet-600 bg-violet-500/10 border-violet-500/20"
      : accent === "blue"
      ? "text-blue-600 bg-blue-500/10 border-blue-500/20"
      : accent === "red"
      ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
      : "text-amber-600 bg-amber-500/10 border-amber-500/20";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg border p-2.5 ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
