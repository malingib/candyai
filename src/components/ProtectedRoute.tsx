import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <img src="/logo.png" alt="Mobiwave" className="h-10 w-10 animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading...</p>
        <Progress value={60} className="h-1 w-32" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
};

export default ProtectedRoute;
