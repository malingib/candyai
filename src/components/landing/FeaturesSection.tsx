import { MessageSquare, Users, Zap, Shield, Bot, BarChart3, Globe, Clock } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Zap,
    title: "Instant resolutions",
    description: "AI understands context and resolves queries in under 3 seconds. No wait times, no frustration.",
    span: "md:col-span-1",
  },
  {
    icon: Bot,
    title: "Trained on your data",
    description: "Upload FAQs, docs, and product info. The AI learns your business and answers like your best agent.",
    span: "md:col-span-1",
  },
  {
    icon: Users,
    title: "Smart handoff to humans",
    description: "When things get complex, AI routes the conversation to your team with full context. No repeat questions.",
    span: "md:col-span-1",
  },
  {
    icon: Globe,
    title: "Deploy everywhere",
    description: "Website widget, WhatsApp, or API. One AI agent across every channel your customers use.",
    span: "md:col-span-1",
  },
  {
    icon: Shield,
    title: "Enterprise-grade security",
    description: "SOC 2 compliant infrastructure. Your data stays encrypted and never leaves your control.",
    span: "md:col-span-1",
  },
  {
    icon: BarChart3,
    title: "Actionable analytics",
    description: "Track resolution rates, customer satisfaction, and conversation patterns in real-time dashboards.",
    span: "md:col-span-1",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            Capabilities
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            Everything you need to automate support
          </h2>
          <p className="text-muted-foreground">
            Replace expensive support teams with AI that works around the clock.
          </p>
        </div>

        <div className="grid gap-px bg-border rounded-2xl overflow-hidden max-w-5xl mx-auto border border-border">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card p-8 ${feature.span} group hover:bg-accent/[0.03] transition-colors`}
            >
              <feature.icon className="h-5 w-5 text-accent mb-4" />
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
