import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Sparkles, Shield, Zap, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TurnstileWidget from "@/components/security/TurnstileWidget";
import { motion } from "framer-motion";

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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const authRedirectBase =
    import.meta.env.VITE_AUTH_REDIRECT_URL?.replace(/\/$/, "") || window.location.origin;
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (turnstileSiteKey && !turnstileToken) {
        throw new Error("Complete the security check to continue.");
      }
      if (!isLogin && !isForgot && !acceptPolicy) {
        throw new Error("Please accept the privacy notice to continue.");
      }
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
        const precheckResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pre-signup-check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, turnstile_token: turnstileToken }),
        });
        const precheckPayload = await precheckResp.json().catch(() => ({}));
        if (!precheckResp.ok) {
          throw new Error(precheckPayload?.error || "Signup security check failed");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authRedirectBase,
            data: { business_name: businessName, marketing_consent: marketingConsent },
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
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-hero flex-col justify-between p-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid-white opacity-[0.03]" />
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mobiwave" className="h-8 w-8" />
            <span className="text-lg font-bold text-hero-foreground">Mobiwave<span className="text-primary">.</span></span>
          </Link>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-hero-foreground mb-6 leading-tight">
            AI customer support<br />
            <span className="text-gradient">that converts.</span>
          </h1>
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-hero-muted">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 shrink-0">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-hero-muted/40">
            &copy; {new Date().getFullYear()} Mobiwave Innovations. Nairobi, Kenya.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center px-4 py-12 bg-background"
      >
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 lg:hidden transition-colors">
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
                  className="h-11 rounded-xl border-border/60 focus:border-primary/50"
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
                className="h-11 rounded-xl border-border/60 focus:border-primary/50"
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
                  className="h-11 rounded-xl border-border/60 focus:border-primary/50"
                />
              </div>
            )}
            {!isLogin && !isForgot && (
              <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border/40">
                <label className="flex items-start gap-3 text-xs text-muted-foreground cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptPolicy}
                    onChange={(e) => setAcceptPolicy(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="group-hover:text-foreground transition-colors">
                    I agree to the <a className="underline text-primary hover:text-primary/80" href="/legal/privacy">Privacy Notice</a> and data processing needed to provide this service.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-xs text-muted-foreground cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="group-hover:text-foreground transition-colors">
                    Send me product updates and offers (optional).
                  </span>
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              disabled={loading}
            >
              {loading ? "Please wait..." : isForgot ? "Send Reset Link" : isLogin ? "Sign In" : "Create Account"}
            </Button>
            <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
          </form>

          <div className="mt-6 text-center text-sm space-y-3">
            {!isForgot && (
              <button onClick={() => setIsForgot(true)} className="text-primary hover:underline block w-full transition-colors">
                Forgot password?
              </button>
            )}
            <button
              onClick={() => { setIsLogin(!isLogin); setIsForgot(false); }}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
