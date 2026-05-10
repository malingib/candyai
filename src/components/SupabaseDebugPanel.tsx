import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SupabaseDebugEntry,
  isSupabaseConfigured,
  subscribeSupabaseDebug,
} from "@/lib/supabase-safe";

const statusVariant: Record<SupabaseDebugEntry["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  success: "default",
  error: "destructive",
  disabled: "outline",
};

const statusLabel: Record<SupabaseDebugEntry["status"], string> = {
  pending: "Pending",
  success: "Success",
  error: "Error",
  disabled: "Disabled",
};

const SupabaseDebugPanel = () => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<SupabaseDebugEntry[]>([]);

  useEffect(() => subscribeSupabaseDebug(setEntries), []);

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(26rem,calc(100vw-2rem))]">
      <div className="rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-card-foreground">Supabase debug</p>
            <p className="text-[11px] text-muted-foreground">
              {isSupabaseConfigured ? "Tracking recent client requests" : "Environment is missing, requests are disabled"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide" : "Show"}
          </Button>
        </div>

        {open && (
          <div className="max-h-72 space-y-2 overflow-y-auto px-3 py-3">
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No Supabase activity recorded yet.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="rounded-md border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{entry.source}</p>
                      <p className="text-[11px] text-muted-foreground">{entry.time}</p>
                    </div>
                    <Badge variant={statusVariant[entry.status]}>{statusLabel[entry.status]}</Badge>
                  </div>
                  {entry.detail && (
                    <p className="mt-2 break-words text-[11px] text-muted-foreground">{entry.detail}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupabaseDebugPanel;