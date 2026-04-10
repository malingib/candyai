import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  { id: "free", name: "Starter", price: "Free Trial", chats: 20, features: ["20 chats/month", "Basic AI responses", "Mobiwave branding"] },
  { id: "growth", name: "Growth", price: "KES 3,500/mo", chats: 2000, features: ["2,000 chats/month", "Remove branding", "Lead capture & export", "Advanced analytics"] },
  { id: "premium", name: "Premium", price: "KES 8,000/mo", chats: 10000, features: ["10,000 chats/month", "API access", "Multiple websites", "Dedicated support"] },
  { id: "enterprise", name: "Enterprise", price: "Custom", chats: 99999, features: ["Unlimited chats", "Full API access", "Dedicated account manager", "SLA guarantee"] },
];

const Billing = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState("free");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setCurrentPlan(data.plan);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card key={plan.id} className={isCurrent ? "border-accent" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && <Badge className="bg-accent text-accent-foreground">Current</Badge>}
                </div>
                <CardDescription className="text-lg font-bold text-foreground">{plan.price}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? "outline" : "default"}
                  className={`w-full ${isCurrent ? "" : "bg-accent text-accent-foreground hover:bg-accent/90"}`}
                  disabled={isCurrent}
                  size="sm"
                >
                  {isCurrent ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Payment integration coming soon. Contact us at hello@mobiwave.ai to upgrade.</p>
    </div>
  );
};

export default Billing;
