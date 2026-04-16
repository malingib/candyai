import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useState, useEffect } from "react";
import SplashScreen from "./components/SplashScreen";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Conversations from "./pages/dashboard/Conversations";
import KnowledgeBase from "./pages/dashboard/KnowledgeBase";
import SettingsPage from "./pages/dashboard/SettingsPage";
import EmbedCode from "./pages/dashboard/EmbedCode";
import Billing from "./pages/dashboard/Billing";
import Leads from "./pages/dashboard/Leads";
import AiChat from "./pages/AiChat";
import GitHubBot from "./pages/dashboard/GitHubBot";
import Tickets from "./pages/dashboard/Tickets";

const queryClient = new QueryClient();

const DashboardRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const seen = sessionStorage.getItem("splash_shown");
    return !seen;
  });

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("splash_shown", "1");
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SplashScreen show={showSplash} />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<DashboardRoute><Overview /></DashboardRoute>} />
              <Route path="/dashboard/conversations" element={<DashboardRoute><Conversations /></DashboardRoute>} />
              <Route path="/dashboard/leads" element={<DashboardRoute><Leads /></DashboardRoute>} />
              <Route path="/dashboard/knowledge-base" element={<DashboardRoute><KnowledgeBase /></DashboardRoute>} />
              <Route path="/dashboard/settings" element={<DashboardRoute><SettingsPage /></DashboardRoute>} />
              <Route path="/dashboard/embed" element={<DashboardRoute><EmbedCode /></DashboardRoute>} />
              <Route path="/dashboard/billing" element={<DashboardRoute><Billing /></DashboardRoute>} />
              <Route path="/dashboard/github-bot" element={<DashboardRoute><GitHubBot /></DashboardRoute>} />
              <Route path="/dashboard/tickets" element={<DashboardRoute><Tickets /></DashboardRoute>} />
              <Route path="/chat" element={<AiChat />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
