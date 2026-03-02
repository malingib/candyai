import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Users, BarChart3, Zap } from "lucide-react";

const Overview = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(p);
      const { count: cc } = await supabase.from("conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setConversationCount(cc ?? 0);
      const { count: lc } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setLeadCount(lc ?? 0);
    };
    fetch();
  }, [user]);

  const usagePercent = profile ? Math.min((profile.chats_used / profile.chats_limit) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chats Used</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.chats_used ?? 0}</div>
            <p className="text-xs text-muted-foreground">of {profile?.chats_limit ?? 50} this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversationCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Captured</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile?.plan ?? "free"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={usagePercent} className="h-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.chats_used ?? 0} / {profile?.chats_limit ?? 50} chats used ({Math.round(usagePercent)}%)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
