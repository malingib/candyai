import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, MessageSquare, BookOpen, Settings, Code, CreditCard, LogOut, Menu, X, Users, GitBranch, Ticket, Zap, ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useUnreadConversations } from "@/hooks/useUnreadConversations";

const userNavItems = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { path: "/dashboard/tickets", label: "Tickets", icon: Ticket },
  { path: "/dashboard/canned-responses", label: "Canned Replies", icon: Zap },
  { path: "/dashboard/leads", label: "Leads", icon: Users },
  { path: "/dashboard/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { path: "/dashboard/settings", label: "Settings", icon: Settings },
  { path: "/dashboard/embed", label: "Embed Code", icon: Code },
  { path: "/dashboard/github-bot", label: "GitHub Bot", icon: GitBranch },
  { path: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

const adminNavItems = [
  { path: "/dashboard/admin", label: "Admin", icon: ShieldAlert },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin } = useIsAdmin(user?.id);
  const { unreadCount } = useUnreadConversations();

  const onAdminRoute = location.pathname.startsWith("/dashboard/admin");
  const items = (isAdmin || onAdminRoute) ? adminNavItems : userNavItems;

  return (
    <div className="flex min-h-screen bg-muted/30">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="relative flex h-16 shrink-0 items-center gap-2.5 px-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-sidebar to-sidebar" />
          <div className="absolute inset-0 bg-grid opacity-30" />
          <img src="/logo.png" alt="Mobiwave" className="relative h-8 w-8" />
          <span className="relative text-base font-bold text-sidebar-foreground">
            Mobiwave<span className="text-primary">.</span>
          </span>
          <button
            className="relative ml-auto md:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 mt-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                )}
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.path === "/dashboard/conversations" && unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="relative h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-xl transition-all duration-200"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-30">
          <button className="md:hidden text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">
              {items.find((i) => i.path === location.pathname)?.label ?? "Dashboard"}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
