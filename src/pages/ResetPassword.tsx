import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [linkReady, setLinkReady] = useState(false);
  const [linkChecking, setLinkChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const passwordPolicy =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/;

  useEffect(() => {
    const prepareRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const queryType = url.searchParams.get("type");
        const hashType = hashParams.get("type");
        const type = queryType || hashType;

        if (type !== "recovery") {
          setLinkError("This reset link is invalid or expired.");
          toast({
            title: "Invalid link",
            description: "This reset link is invalid or expired.",
            variant: "destructive",
          });
          return;
        }

        const tokenHash = url.searchParams.get("token_hash");
        const code = url.searchParams.get("code");

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Could not validate recovery session. Please request a new reset link.");
        }

        setLinkReady(true);
        setLinkError(null);
      } catch (error: unknown) {
        const err = error as Error;
        setLinkError(err.message || "This reset link is invalid or expired.");
        toast({
          title: "Invalid link",
          description: err.message || "This reset link is invalid or expired.",
          variant: "destructive",
        });
      } finally {
        setLinkChecking(false);
      }
    };

    void prepareRecoverySession();
  }, [toast]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkReady) return;

    if (!passwordPolicy.test(password)) {
      toast({
        title: "Weak password",
        description:
          "Use at least 10 characters with uppercase, lowercase, number, and symbol.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast({ title: "Password updated!", description: "Sign in with your new password." });
      navigate("/auth");
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Set New Password</CardTitle></CardHeader>
        <CardContent>
          {linkChecking && (
            <p className="mb-4 text-sm text-muted-foreground">Validating your reset link...</p>
          )}
          {!linkChecking && linkError && (
            <p className="mb-4 text-sm text-destructive">{linkError}</p>
          )}
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} disabled={linkChecking || !linkReady} />
            </div>
            <p className="text-xs text-muted-foreground">
              Password must be 10+ characters and include uppercase, lowercase, number, and symbol.
            </p>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading || linkChecking || !linkReady}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
