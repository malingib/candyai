import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const tiers = [
  {
    name: "Free",
    price: "0",
    currency: "",
    period: "",
    description: "Try the AI agent with no commitment",
    features: ["50 chats/month", "Basic AI responses", "Mobiwave branding", "1 website"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "1,500",
    currency: "KES",
    period: "/mo",
    description: "For small businesses getting started",
    features: ["500 chats/month", "SMTP email integration", "Lead capture & export", "Basic analytics", "Custom knowledge base"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "3,500",
    currency: "KES",
    period: "/mo",
    description: "For growing businesses that need more",
    features: ["2,000 chats/month", "SMS follow-up", "Remove branding", "Advanced analytics", "Priority AI responses", "Custom welcome message"],
    cta: "Upgrade to Growth",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "8,000+",
    currency: "KES",
    period: "/mo",
    description: "For large businesses and agencies",
    features: ["Unlimited chats", "API access", "Priority support", "Multiple websites", "Custom integrations", "Dedicated account manager"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-foreground md:text-5xl mb-4"
          >
            Simple, <span className="text-accent">Transparent</span> Pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Start free. Upgrade when you need more. No hidden fees.
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all hover:shadow-xl ${
                tier.highlighted
                  ? "border-accent bg-card shadow-xl shadow-accent/10 ring-2 ring-accent/20 scale-[1.03]"
                  : "bg-card border-border hover:border-accent/20"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-card-foreground">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  {tier.currency && <span className="text-sm text-muted-foreground">{tier.currency}</span>}
                  <span className="text-4xl font-extrabold text-card-foreground">{tier.price}</span>
                  {tier.period && <span className="text-sm text-muted-foreground">{tier.period}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-card-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button
                  className={`w-full rounded-full ${
                    tier.highlighted
                      ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
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
