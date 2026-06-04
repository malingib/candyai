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
    price: "5,000",
    period: "KES/mo",
    description: "For businesses ready to scale their support.",
    features: [
      "2,000 chats/month",
      "1 website embed",
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
    price: "10,000",
    period: "KES/mo",
    description: "For high-volume teams that need everything.",
    features: [
      "10,000 chats/month",
      "2 website embeds",
      "API access",
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
      "99,999 chats/month",
      "4 website embeds",
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/2 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto items-start"
        >
          {tiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={cardVariants}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                tier.highlighted
                  ? "border-primary/40 bg-card shadow-2xl shadow-primary/15 ring-1 ring-primary/20 scale-[1.02] lg:scale-[1.05]"
                  : "bg-card/50 backdrop-blur-sm border-border/60 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              }`}
            >
              {tier.highlighted && (
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-blue-600 px-4 py-1 text-xs font-bold text-primary-foreground tracking-wide uppercase shadow-lg shadow-primary/30"
                >
                  <span className="relative z-10">Recommended</span>
                  <span className="absolute inset-0 rounded-full bg-primary blur-md opacity-50 animate-pulse" />
                </motion.div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {tier.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  {tier.price !== "Custom" && (
                    <span className="text-sm text-muted-foreground font-medium">KES</span>
                  )}
                  <span className="text-4xl font-black text-card-foreground tracking-tight">
                    {tier.price}
                  </span>
                  {tier.period && tier.price !== "0" && (
                    <span className="text-sm text-muted-foreground ml-1">
                      /{tier.period.replace("KES/", "")}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <span className="flex h-5 w-5 mt-0.5 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    <span className="text-card-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button
                  className={`w-full rounded-xl font-medium h-11 transition-all duration-300 ${
                    tier.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md"
                  }`}
                >
                  {tier.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
