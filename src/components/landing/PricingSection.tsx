import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const tiers = [
  {
    name: "Starter",
    price: "0",
    period: "forever",
    description: "For trying out Mobiwave AI",
    features: ["50 chats/month", "1 website", "Basic AI responses", "Community support"],
    cta: "Get started free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "3,500",
    period: "KES/mo",
    description: "For businesses ready to scale",
    features: [
      "2,000 chats/month",
      "Remove branding",
      "Lead capture & export",
      "Custom knowledge base",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large teams and agencies",
    features: [
      "Unlimited chats",
      "API access",
      "Multiple websites",
      "Custom integrations",
      "Dedicated account manager",
      "SLA & uptime guarantee",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            Start free, scale as you grow
          </h2>
          <p className="text-muted-foreground">
            No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto items-start">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-xl border p-6 flex flex-col ${
                tier.highlighted
                  ? "border-accent bg-card shadow-lg shadow-accent/10 ring-1 ring-accent/20"
                  : "bg-card border-border"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                  Most popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-card-foreground">{tier.price}</span>
                  {tier.period && <span className="text-sm text-muted-foreground ml-1">{tier.period}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-card-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button
                  className={`w-full rounded-lg ${
                    tier.highlighted
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
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
