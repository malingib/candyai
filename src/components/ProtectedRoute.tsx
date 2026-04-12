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
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Mobiwave AI" className="h-10 w-10 animate-pulse" />
          <div className="h-1 w-32 rounded-full overflow-hidden bg-muted">
            <div className="h-full w-1/2 rounded-full bg-accent animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
