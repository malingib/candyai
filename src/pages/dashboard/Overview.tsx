import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Users, BarChart3, Zap, TrendingUp, Sparkles, ArrowUpRight, Bot } from "lucide-react";
import { Navigate } from "react-router-dom";
import { formatCycleResetDate } from "@/lib/billing-cycle";
import { motion } from "framer-motion";

type Profile = {
  chats_used: number;
  chats_limit: number;
  leads_used?: number;
  leads_limit?: number;
  plan: string;
  chats_period_started_at?: string;
  billing_expires_at?: string | null;
  trial_expires_at?: string | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const Overview = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [widgetSitesCount, setWidgetSitesCount] = useState(0);

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

  useEffect(() => {
    if (!user) return;
    supabase
      .from("widget_domains")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true)
      .then(({ count }) => setWidgetSitesCount(count ?? 0));
  }, [user]);

  if (roleLoading) {
    return <div className="text-sm text-muted-foreground pt-8 text-center">Checking dashboard access...</div>;
  }

  if (isAdmin) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  const usagePercent = profile ? Math.min((profile.chats_used / profile.chats_limit) * 100, 100) : 0;
  const remainingChats = profile ? Math.max((profile.chats_limit ?? 0) - (profile.chats_used ?? 0), 0) : 0;
  const remainingLeads = profile ? Math.max((profile.leads_limit ?? 0) - (profile.leads_used ?? 0), 0) : 0;
  const resetLabel = formatCycleResetDate(profile?.chats_period_started_at ?? null);
  const isBillingExpired =
    !!profile?.billing_expires_at && new Date(profile.billing_expires_at).getTime() < Date.now();
  const isFreeTrialExpired =
    profile?.plan === "free" &&
    !!profile?.trial_expires_at &&
    new Date(profile.trial_expires_at).getTime() < Date.now();

  const stats = [
    {
      title: "Chats Used",
      value: profile?.chats_used ?? 0,
      subtitle: `of ${profile?.chats_limit ?? 50} this month`,
      icon: MessageSquare,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Conversations",
      value: conversationCount,
      subtitle: "total threads",
      icon: BarChart3,
      gradient: "from-purple-500 to-violet-600",
    },
    {
      title: "Leads Captured",
      value: leadCount,
      subtitle: "from AI agent",
      icon: Users,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      title: "Current Plan",
      value: profile?.plan ?? "free",
      subtitle: "active subscription",
      icon: Sparkles,
      gradient: "from-amber-500 to-orange-600",
      capitalize: true,
    },
  ];

  const remainingWidgetSites = profile ? Math.max((profile.widget_sites_limit ?? 0) - widgetSitesCount, 0) : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-6 md:p-8 text-primary-foreground"
      >
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-5 w-5 text-primary-foreground/70" />
              <span className="text-xs font-medium text-primary-foreground/60 uppercase tracking-wider">Dashboard</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">Welcome back</h2>
            <p className="text-primary-foreground/70 text-sm md:text-base max-w-md">
              Here&apos;s what&apos;s happening with your AI agent today.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            All systems operational
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className="group border-border/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.capitalize ? "capitalize" : ""}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Progress value={usagePercent} className="h-3 bg-muted/50" />
                <div
                  className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-primary via-blue-500 to-primary/70 transition-all duration-1000"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {profile?.chats_used ?? 0} / {profile?.chats_limit ?? 50} chats used
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  {Math.round(usagePercent)}%
                  <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Chats remaining</p>
                  <p className="text-lg font-bold text-foreground mt-1">{remainingChats}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Resets {resetLabel}</p>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Leads remaining</p>
                  <p className="text-lg font-bold text-foreground mt-1">{remainingLeads}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">30-day cycle</p>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Widget sites</p>
                  <p className="text-lg font-bold text-foreground mt-1">{remainingWidgetSites}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Limit: {profile?.widget_sites_limit ?? 0}</p>
                </div>
              </div>

              {isBillingExpired && (
                <p className="text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2 border border-destructive/20">
                  Paid plan expired. Free-tier limits are now in effect.
                </p>
              )}
              {isFreeTrialExpired && (
                <p className="text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2 border border-destructive/20">
                  Free trial expired. Upgrade to continue chatting.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Overview;
