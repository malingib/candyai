import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const tiers = [
  {
    name: "Starter",
    price: "0",
    period: "Free trial",
    description: "Try Mobiwave AI risk-free with 20 chats/month.",
    features: ["20 chats/month", "1 website", "Basic AI responses", "Mobiwave branding", "Community support"],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "3,500",
    period: "KES/mo",
    description: "For businesses ready to scale their support.",
    features: [
      "2,000 chats/month",
      "Remove branding",
      "Lead capture & export",
      "Custom knowledge base",
      "Advanced analytics",
      "Priority email support",
    ],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "8,000",
    period: "KES/mo",
    description: "For high-volume teams that need everything.",
    features: [
      "10,000 chats/month",
      "API access",
      "Multiple websites",
      "SMS & email follow-up",
      "Custom integrations",
      "Dedicated support",
      "Priority queue",
    ],
    cta: "Get started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large orgs and agencies at scale.",
    features: [
      "Unlimited chats",
      "Full API access",
      "Dedicated account manager",
      "SLA & uptime guarantee",
      "Custom model training",
      "On-premise option",
      "SSO & RBAC",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Pricing
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              Start free, scale as you grow
            </h2>
            <p className="text-lg text-muted-foreground">
              No hidden fees. No contracts. Cancel anytime.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto items-start">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                tier.highlighted
                  ? "border-primary bg-card shadow-xl shadow-primary/10 ring-2 ring-primary/20 scale-[1.02]"
                  : "bg-card border-border hover:border-primary/20 hover:shadow-lg transition-all"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground tracking-wide uppercase">
                  Recommended
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  {tier.price !== "Custom" && <span className="text-sm text-muted-foreground">KES</span>}
                  <span className="text-4xl font-black text-card-foreground">{tier.price}</span>
                  {tier.period && tier.price !== "0" && <span className="text-sm text-muted-foreground ml-1">/{tier.period.replace("KES/", "")}</span>}
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-card-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button
                  className={`w-full rounded-xl font-medium ${
                    tier.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {tier.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
