import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Plus, ArrowRightLeft, Flag, UserPlus, MessageCircle, CheckCircle2, Loader2, Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CannedResponsePicker } from "./CannedResponsePicker";

interface Activity {
  id: string;
  activity_type: "created" | "status_change" | "priority_change" | "assignment" | "comment" | "resolution";
  from_value: string | null;
  to_value: string | null;
  comment: string | null;
  actor_name: string | null;
  created_at: string;
}

const iconMap = {
  created: { Icon: Plus, color: "text-blue-600 bg-blue-100 dark:bg-blue-950" },
  status_change: { Icon: ArrowRightLeft, color: "text-amber-600 bg-amber-100 dark:bg-amber-950" },
  priority_change: { Icon: Flag, color: "text-orange-600 bg-orange-100 dark:bg-orange-950" },
  assignment: { Icon: UserPlus, color: "text-purple-600 bg-purple-100 dark:bg-purple-950" },
  comment: { Icon: MessageCircle, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
  resolution: { Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950" },
};

const labelFor = (a: Activity) => {
  switch (a.activity_type) {
    case "created":
      return <>Ticket created</>;
    case "status_change":
      return <>Status changed from <b>{a.from_value}</b> to <b>{a.to_value}</b></>;
    case "priority_change":
      return <>Priority changed from <b>{a.from_value}</b> to <b>{a.to_value}</b></>;
    case "assignment":
      return a.to_value
        ? <>Assigned to <b>{a.to_value}</b></>
        : <>Unassigned (was <b>{a.from_value}</b>)</>;
    case "comment":
      return <>Comment added</>;
    case "resolution":
      return <>Marked as resolved</>;
  }
};

export const TicketTimeline = ({ ticketId }: { ticketId: string }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ticket_activities")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });
    setActivities((data ?? []) as Activity[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ticketId]);

  const addComment = async () => {
    if (!comment.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from("ticket_activities").insert({
      ticket_id: ticketId,
      user_id: user.id,
      activity_type: "comment",
      comment: comment.trim(),
      actor_name: user.email?.split("@")[0] ?? "",
    });
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    } else {
      setComment("");
      load();
    }
    setPosting(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment to the timeline..."
          className="resize-none"
        />
        <div className="flex justify-between items-center gap-2">
          <CannedResponsePicker onPick={(content) => setComment((prev) => (prev ? prev + "\n\n" + content : content))} />
          <Button size="sm" onClick={addComment} disabled={!comment.trim() || posting} className="gap-2">
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Post comment
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
      ) : (
        <ol className="relative border-l border-border ml-3 space-y-4 pl-6 pt-1">
          {activities.map((a) => {
            const { Icon, color } = iconMap[a.activity_type];
            return (
              <li key={a.id} className="relative">
                <span className={`absolute -left-[34px] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${color}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="text-sm">
                  <p className="text-foreground">
                    {labelFor(a)}
                    {a.actor_name && <span className="text-muted-foreground"> · by {a.actor_name}</span>}
                  </p>
                  {a.comment && (
                    <p className="mt-1.5 rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                      {a.comment}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
