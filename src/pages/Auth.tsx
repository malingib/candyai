import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "We sent you a password reset link." });
        setIsForgot(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { business_name: businessName },
          },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Check your email to verify your account before signing in.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <MessageSquare className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">Mobiwave AI</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {isForgot ? "Reset Password" : isLogin ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {isForgot
                ? "Enter your email to receive a reset link"
                : isLogin
                ? "Sign in to your dashboard"
                : "Start with 50 free chats/month"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && !isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="business">Business Name</Label>
                  <Input
                    id="business"
                    placeholder="My Business"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              )}

              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? "Please wait..." : isForgot ? "Send Reset Link" : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm space-y-2">
              {!isForgot && (
                <button onClick={() => setIsForgot(true)} className="text-accent hover:underline block w-full">
                  Forgot password?
                </button>
              )}
              <button
                onClick={() => { setIsLogin(!isLogin); setIsForgot(false); }}
                className="text-muted-foreground hover:text-foreground"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
