import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useState, useEffect, lazy, Suspense } from "react";
import SplashScreen from "./components/SplashScreen";
import LoadingSpinner from "./components/LoadingSpinner";
import CookieConsentBanner from "./components/CookieConsentBanner";
import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import { UnreadConversationsProvider } from "./hooks/useUnreadConversations";
import { useAuth } from "./hooks/useAuth";
import { useIsAdmin } from "./hooks/useIsAdmin";

const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AiChat = lazy(() => import("./pages/AiChat"));
const PrivacyCompliance = lazy(() => import("./pages/PrivacyCompliance"));

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

const UserOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin(user?.id);

  if (loading) return <LoadingSpinner />;
  if (isAdmin) return <Navigate to="/dashboard/admin" replace />;
  return <>{children}</>;
};

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
              <Route path="/dashboard" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><Overview /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/conversations" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><Conversations /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/leads" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><Leads /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/knowledge-base" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><KnowledgeBase /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/settings" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><SettingsPage /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/embed" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><EmbedCode /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/billing" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><Billing /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/github-bot" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><GitHubBot /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/tickets" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><Tickets /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/canned-responses" element={<DashboardRoute><UserOnlyRoute><DashboardPageLoader><CannedResponses /></DashboardPageLoader></UserOnlyRoute></DashboardRoute>} />
              <Route path="/dashboard/admin" element={<DashboardRoute><DashboardPageLoader><Admin /></DashboardPageLoader></DashboardRoute>} />
              <Route path="/chat" element={<AiChat />} />
              <Route path="/legal/privacy" element={<PrivacyCompliance />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <CookieConsentBanner />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
