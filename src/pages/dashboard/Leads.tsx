import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Phone, MessageCircle, Users, Mail, Loader2, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

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
    return !q || l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.toLowerCase().includes(q) || l.notes?.toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Notes", "Date"];
    const rows = filtered.map((l) => [l.name || "", l.email || "", l.phone || "", l.notes || "", format(new Date(l.created_at), "yyyy-MM-dd HH:mm")]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Total Leads", value: leads.length, icon: Users, gradient: "from-blue-500 to-blue-600", subtitle: "all time" },
    { label: "With Email", value: leads.filter((l) => l.email).length, icon: Mail, gradient: "from-emerald-500 to-teal-600", subtitle: "contactable" },
    { label: "With Phone", value: leads.filter((l) => l.phone).length, icon: Phone, gradient: "from-amber-500 to-orange-600", subtitle: "callable" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
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
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border/50 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label} · {stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">All Leads</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="pl-9 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No leads match your search." : "No leads captured yet. Your AI agent will collect visitor info automatically."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead, idx) => (
                    <TableRow
                      key={lead.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="font-medium">
                        {lead.name || <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell>
                        {lead.email ? (
                          <span className="text-sm">{lead.email}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.phone ? (
                          <span className="text-sm font-mono">{lead.phone}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm truncate block">{lead.notes || <span className="text-muted-foreground italic">—</span>}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(lead.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {lead.phone && (
                            <>
                              <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors" title="WhatsApp">
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              </a>
                              <a href={`tel:${lead.phone}`}>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" title="Call">
                                  <Phone className="h-4 w-4" />
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
    </motion.div>
  );
};

export default Leads;
