import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useState, useEffect, lazy, Suspense } from "react";
import SplashScreen from "./components/SplashScreen";
import LoadingSpinner from "./components/LoadingSpinner";
import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import { UnreadConversationsProvider } from "./hooks/useUnreadConversations";

const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AiChat = lazy(() => import("./pages/AiChat"));

const queryClient = new QueryClient();

const Overview = lazy(() => import("./pages/dashboard/Overview"));
const Conversations = lazy(() => import("./pages/dashboard/Conversations"));
const KnowledgeBase = lazy(() => import("./pages/dashboard/KnowledgeBase"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const EmbedCode = lazy(() => import("./pages/dashboard/EmbedCode"));
const Billing = lazy(() => import("./pages/dashboard/Billing"));
const Leads = lazy(() => import("./pages/dashboard/Leads"));
const GitHubBot = lazy(() => import("./pages/dashboard/GitHubBot"));
const Tickets = lazy(() => import("./pages/dashboard/Tickets"));
const CannedResponses = lazy(() => import("./pages/dashboard/CannedResponses"));
const Admin = lazy(() => import("./pages/dashboard/Admin"));

const DashboardRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <UnreadConversationsProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </UnreadConversationsProvider>
  </ProtectedRoute>
);

const DashboardPageLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
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
            <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<DashboardRoute><DashboardPageLoader><Overview /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/conversations" element={<DashboardRoute><DashboardPageLoader><Conversations /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/leads" element={<DashboardRoute><DashboardPageLoader><Leads /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/knowledge-base" element={<DashboardRoute><DashboardPageLoader><KnowledgeBase /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/settings" element={<DashboardRoute><DashboardPageLoader><SettingsPage /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/embed" element={<DashboardRoute><DashboardPageLoader><EmbedCode /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/billing" element={<DashboardRoute><DashboardPageLoader><Billing /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/github-bot" element={<DashboardRoute><DashboardPageLoader><GitHubBot /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/tickets" element={<DashboardRoute><DashboardPageLoader><Tickets /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/canned-responses" element={<DashboardRoute><DashboardPageLoader><CannedResponses /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/dashboard/admin" element={<DashboardRoute><DashboardPageLoader><Admin /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/chat" element={<AiChat />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;