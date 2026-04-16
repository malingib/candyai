import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Ticket as TicketIcon, Trash2, Filter } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TicketTimeline } from "@/components/tickets/TicketTimeline";

const notifyEmail = async (ticket_id: string, event: "created" | "assigned" | "resolved", extra?: string) => {
  try {
    await supabase.functions.invoke("send-ticket-email", {
      body: { ticket_id, event, extra },
    });
  } catch (e) {
    console.error("Email notification failed:", e);
  }
};

type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  customer_name: string | null;
  customer_email: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900" },
  in_progress: { label: "In Progress", className: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900" },
  waiting: { label: "Waiting", className: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900" },
  resolved: { label: "Resolved", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
};

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-slate-500/10 text-slate-600 border-slate-200" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  high: { label: "High", className: "bg-orange-500/10 text-orange-600 border-orange-200" },
  urgent: { label: "Urgent", className: "bg-red-500/10 text-red-600 border-red-200" },
};

const Tickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "medium" as TicketPriority,
    status: "open" as TicketStatus,
    assigned_to: "",
    customer_name: "",
    customer_email: "",
    resolution: "",
  });

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading tickets", description: error.message, variant: "destructive" });
    } else {
      setTickets((data ?? []) as Ticket[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  const resetForm = () => {
    setForm({
      subject: "",
      description: "",
      priority: "medium",
      status: "open",
      assigned_to: "",
      customer_name: "",
      customer_email: "",
      resolution: "",
    });
  };

  const handleCreate = async () => {
    if (!user || !form.subject.trim()) {
      toast({ title: "Subject required", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.from("tickets").insert({
      user_id: user.id,
      subject: form.subject,
      description: form.description,
      priority: form.priority,
      status: form.status,
      assigned_to: form.assigned_to,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
    }).select("id").single();
    if (error) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      return;
    }
    if (data) notifyEmail(data.id, "created");
    if (data && form.assigned_to) notifyEmail(data.id, "assigned", form.assigned_to);
    toast({ title: "Ticket created" });
    setCreateOpen(false);
    resetForm();
    loadTickets();
  };

  const openEdit = (t: Ticket) => {
    setEditTicket(t);
    setForm({
      subject: t.subject,
      description: t.description ?? "",
      priority: t.priority,
      status: t.status,
      assigned_to: t.assigned_to ?? "",
      customer_name: t.customer_name ?? "",
      customer_email: t.customer_email ?? "",
      resolution: t.resolution ?? "",
    });
  };

  const handleUpdate = async () => {
    if (!editTicket) return;
    const updates: Record<string, unknown> = {
      subject: form.subject,
      description: form.description,
      priority: form.priority,
      status: form.status,
      assigned_to: form.assigned_to,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      resolution: form.resolution,
    };
    const becomingResolved = (form.status === "resolved" || form.status === "closed") &&
      editTicket.status !== "resolved" && editTicket.status !== "closed";
    if (becomingResolved) {
      updates.resolved_at = new Date().toISOString();
    }
    const assigneeChanged = (form.assigned_to || "") !== (editTicket.assigned_to || "");
    const { error } = await supabase.from("tickets").update(updates).eq("id", editTicket.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    if (assigneeChanged && form.assigned_to) {
      notifyEmail(editTicket.id, "assigned", form.assigned_to);
    }
    if (becomingResolved) {
      notifyEmail(editTicket.id, "resolved");
    }
    toast({ title: "Ticket updated" });
    setEditTicket(null);
    resetForm();
    loadTickets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ticket?")) return;
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ticket deleted" });
    loadTickets();
  };

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.customer_name ?? "").toLowerCase().includes(q) ||
        (t.assigned_to ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    urgent: tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const TicketForm = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Subject *</Label>
        <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of the issue" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed description..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TicketStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Assigned to</Label>
          <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Team member name" />
        </div>
        <div className="space-y-2">
          <Label>Customer name</Label>
          <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Jane Doe" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Customer email</Label>
        <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="jane@example.com" />
      </div>
      {editTicket && (
        <div className="space-y-2">
          <Label>Resolution notes</Label>
          <Textarea rows={3} value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="How was this resolved?" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
          <p className="text-sm text-muted-foreground">Track, prioritize and resolve customer issues</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create ticket</DialogTitle></DialogHeader>
            {TicketForm}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Open", value: stats.open, color: "text-blue-600" },
          { label: "In Progress", value: stats.in_progress, color: "text-amber-600" },
          { label: "Urgent", value: stats.urgent, color: "text-red-600" },
          { label: "Resolved", value: stats.resolved, color: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All tickets ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <TicketIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No tickets yet. Create your first one.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => openEdit(t)}>
                        <TableCell className="font-medium max-w-xs truncate">{t.subject}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.customer_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusConfig[t.status].className}>
                            {statusConfig[t.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={priorityConfig[t.priority].className}>
                            {priorityConfig[t.priority].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.assigned_to || "Unassigned"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openEdit(t)}
                    className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm flex-1 line-clamp-2">{t.subject}</p>
                      <Badge variant="outline" className={`${priorityConfig[t.priority].className} shrink-0`}>
                        {priorityConfig[t.priority].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={statusConfig[t.status].className}>
                        {statusConfig[t.status].label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t.customer_name || "No customer"} · {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editTicket} onOpenChange={(o) => { if (!o) { setEditTicket(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit ticket</DialogTitle></DialogHeader>
          {TicketForm}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditTicket(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tickets;
