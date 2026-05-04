import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Phone, MessageCircle, Users } from "lucide-react";
import { format } from "date-fns";

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

const Leads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchLeads = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leads")
        .select("id, name, email, phone, notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setLeads(data || []);
      setLoading(false);
    };
    fetchLeads();
  }, [user]);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Notes", "Date"];
    const rows = filtered.map((l) => [
      l.name || "",
      l.email || "",
      l.phone || "",
      l.notes || "",
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Leads</h2>
          <p className="text-sm text-muted-foreground">Visitor contact information captured by your AI agent</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2" disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leads.length}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leads.filter((l) => l.email).length}</p>
              <p className="text-xs text-muted-foreground">With Email</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leads.filter((l) => l.phone).length}</p>
              <p className="text-xs text-muted-foreground">With Phone</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">All Leads</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {search ? "No leads match your search." : "No leads captured yet. Your AI agent will collect visitor info automatically."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{lead.email || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{lead.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{lead.notes || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(lead.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {lead.phone && (
                            <>
                              <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="WhatsApp">
                                  <MessageCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              </a>
                              <a href={`tel:${lead.phone}`}>
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Call">
                                  <Phone className="h-4 w-4 text-primary" />
                                </Button>
                              </a>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leads;
