import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const benefits = [
  "Deploy AI support in 5 minutes",
  "20 free chats/month — no card needed",
  "Capture leads while you sleep",
  "Trusted by 500+ businesses",
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const authRedirectBase =
    import.meta.env.VITE_AUTH_REDIRECT_URL?.replace(/\/$/, "") || window.location.origin;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${authRedirectBase}/reset-password`,
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
            emailRedirectTo: authRedirectBase,
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
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mobiwave" className="h-8 w-8" />
            <span className="text-lg font-bold text-hero-foreground">Mobiwave<span className="text-primary">.</span></span>
          </Link>
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-hero-foreground mb-6 leading-tight">
            AI customer support<br />
            <span className="text-primary">that converts.</span>
          </h1>
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-hero-muted">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-hero-muted/40">
            © {new Date().getFullYear()} Mobiwave Innovations. Nairobi, Kenya.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 lg:hidden">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <img src="/logo.png" alt="Mobiwave" className="h-8 w-8" />
              <span className="text-lg font-bold text-foreground">Mobiwave<span className="text-primary">.</span></span>
            </div>

            <h2 className="text-2xl font-bold text-foreground">
              {isForgot ? "Reset your password" : isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isForgot
                ? "Enter your email to receive a reset link"
                : isLogin
                ? "Sign in to your dashboard"
                : "Start with 20 free chats/month — no credit card"}
            </p>
          </div>

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
                  className="h-11 rounded-xl"
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
                className="h-11 rounded-xl"
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
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" disabled={loading}>
              {loading ? "Please wait..." : isForgot ? "Send Reset Link" : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            {!isForgot && (
              <button onClick={() => setIsForgot(true)} className="text-primary hover:underline block w-full">
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
        </div>
      </div>
    </div>
  );
};

export default Auth;
