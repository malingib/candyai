import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, AlertTriangle, Activity, Lock } from "lucide-react";

type LogRow = {
  id: string;
  created_at: string;
  function_name: string;
  event_type: string;
  status_code: number | null;
  ip: string | null;
  user_id: string | null;
  session_id: string | null;
  scope: string | null;
  message: string | null;
};

const eventColor: Record<string, string> = {
  rate_limited: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  error: "bg-destructive/15 text-destructive",
  unauthorized: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "rate_limited" | "error" | "unauthorized">("all");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState({ rate_limited: 0, error: 0, unauthorized: 0, total: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const load = async () => {
      let q = supabase
        .from("request_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("event_type", filter);
      const { data } = await q;
      if (!active) return;
      setLogs((data ?? []) as LogRow[]);

      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: agg } = await supabase
        .from("request_logs")
        .select("event_type")
        .gte("created_at", since);
      const s = { rate_limited: 0, error: 0, unauthorized: 0, total: agg?.length ?? 0 };
      (agg ?? []).forEach((r: { event_type: string }) => {
        if (r.event_type in s) (s as Record<string, number>)[r.event_type]++;
      });
      setStats(s);
    };
    load();
    const ch = supabase
      .channel("request_logs_admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "request_logs" }, load)
      .subscribe();
    const t = setInterval(load, 15_000);
    return () => { active = false; clearInterval(t); supabase.removeChannel(ch); };
  }, [isAdmin, filter]);

  if (isAdmin === null) return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>;
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Admins only</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You don't have admin access. Ask an admin to grant you the role.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Events (24h)" value={stats.total} />
        <StatCard icon={AlertTriangle} label="Rate-limited" value={stats.rate_limited} tone="warn" />
        <StatCard icon={ShieldAlert} label="Errors" value={stats.error} tone="error" />
        <StatCard icon={Lock} label="Unauthorized" value={stats.unauthorized} tone="purple" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent events</CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="rate_limited">Rate-limited</TabsTrigger>
              <TabsTrigger value="error">Errors</TabsTrigger>
              <TabsTrigger value="unauthorized">Unauthorized</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Function</th>
                    <th className="text-left p-2">Event</th>
                    <th className="text-left p-2">Scope</th>
                    <th className="text-left p-2">IP</th>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleTimeString()}
                      </td>
                      <td className="p-2 font-mono text-xs">{l.function_name}</td>
                      <td className="p-2">
                        <Badge className={eventColor[l.event_type] ?? ""} variant="secondary">
                          {l.event_type}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs">{l.scope ?? "—"}</td>
                      <td className="p-2 font-mono text-xs">{l.ip ?? "—"}</td>
                      <td className="p-2 font-mono text-xs">{l.user_id ? l.user_id.slice(0, 8) : "—"}</td>
                      <td className="p-2 text-xs text-muted-foreground max-w-[280px] truncate">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone?: "warn" | "error" | "purple" }) {
  const toneCls =
    tone === "warn" ? "text-amber-600 dark:text-amber-400" :
    tone === "error" ? "text-destructive" :
    tone === "purple" ? "text-purple-600 dark:text-purple-400" :
    "text-foreground";
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
