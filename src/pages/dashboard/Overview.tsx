import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Users, BarChart3, Zap, TrendingUp } from "lucide-react";
import { Navigate } from "react-router-dom";

type Profile = { chats_used: number; chats_limit: number; plan: string };
const Overview = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(p);
      const { count: cc } = await supabase.from("conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setConversationCount(cc ?? 0);
      const { count: lc } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setLeadCount(lc ?? 0);
    };
    fetchData();
  }, [user]);

  if (roleLoading) {
    return <div className="text-sm text-muted-foreground">Checking dashboard access…</div>;
  }

  if (isAdmin) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  const usagePercent = profile ? Math.min((profile.chats_used / profile.chats_limit) * 100, 100) : 0;

  const stats = [
    {
      title: "Chats Used",
      value: profile?.chats_used ?? 0,
      subtitle: `of ${profile?.chats_limit ?? 50} this month`,
      icon: MessageSquare,
      iconColor: "bg-primary/10 text-primary",
    },
    {
      title: "Conversations",
      value: conversationCount,
      subtitle: "total threads",
      icon: BarChart3,
      iconColor: "bg-purple-100 text-purple-600",
    },
    {
      title: "Leads Captured",
      value: leadCount,
      subtitle: "from AI agent",
      icon: Users,
      iconColor: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Current Plan",
      value: profile?.plan ?? "free",
      subtitle: "active subscription",
      icon: Zap,
      iconColor: "bg-amber-100 text-amber-600",
      capitalize: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-600 p-6 text-primary-foreground">
        <h2 className="text-xl font-bold mb-1">Welcome back 👋</h2>
        <p className="text-primary-foreground/70 text-sm">
          Here's what's happening with your AI agent today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.capitalize ? 'capitalize' : ''}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconColor}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={usagePercent} className="h-3" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {profile?.chats_used ?? 0} / {profile?.chats_limit ?? 50} chats used
              </p>
              <span className="text-sm font-semibold text-foreground">{Math.round(usagePercent)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
