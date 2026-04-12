import { MessageSquare, Users, Zap, Shield, Bot, BarChart3, Globe, Clock } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Zap,
    title: "Instant resolutions",
    description: "AI understands context and resolves queries in under 3 seconds. No wait times.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Bot,
    title: "Trained on your data",
    description: "Upload FAQs, docs, product info. The AI learns your business and answers like your best agent.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Users,
    title: "Smart handoff to humans",
    description: "When things get complex, AI routes to your team with full context. No repeat questions.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    icon: Globe,
    title: "Deploy everywhere",
    description: "Website widget, WhatsApp, or API. One AI agent across every channel.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: Shield,
    title: "Enterprise-grade security",
    description: "SOC 2 compliant infrastructure. Data encrypted and never leaves your control.",
    color: "bg-red-100 text-red-600",
  },
  {
    icon: BarChart3,
    title: "Actionable analytics",
    description: "Track resolution rates, satisfaction, and conversation patterns in real-time.",
    color: "bg-sky-100 text-sky-600",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-background relative">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Platform
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              Everything you need to automate support
            </h2>
            <p className="text-lg text-muted-foreground">
              Replace expensive support teams with AI that works around the clock.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group rounded-2xl border border-border bg-card p-7 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.color} mb-5`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-card-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
