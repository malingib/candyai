import { MessageSquare, Users, Zap, Shield, Bot, BarChart3, Globe, Clock } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Zap,
    title: "Instant resolutions",
    description: "AI understands context and resolves queries in under 3 seconds. No wait times.",
    gradient: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-500",
  },
  {
    icon: Bot,
    title: "Trained on your data",
    description: "Upload FAQs, docs, product info. The AI learns your business and answers like your best agent.",
    gradient: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-500",
  },
  {
    icon: Users,
    title: "Smart handoff to humans",
    description: "When things get complex, AI routes to your team with full context. No repeat questions.",
    gradient: "from-orange-500/20 to-orange-600/10",
    iconColor: "text-orange-500",
  },
  {
    icon: Globe,
    title: "Deploy everywhere",
    description: "Website widget, WhatsApp, or API. One AI agent across every channel.",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-500",
  },
  {
    icon: Shield,
    title: "Enterprise-grade security",
    description: "SOC 2 compliant infrastructure. Data encrypted and never leaves your control.",
    gradient: "from-red-500/20 to-red-600/10",
    iconColor: "text-red-500",
  },
  {
    icon: BarChart3,
    title: "Actionable analytics",
    description: "Track resolution rates, satisfaction, and conversation patterns in real-time.",
    gradient: "from-sky-500/20 to-sky-600/10",
    iconColor: "text-sky-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-50" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/3 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-purple-500/3 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Platform
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              Everything you need to automate support
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Replace expensive support teams with AI that works around the clock.
            </p>
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-7 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1"
            >
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />
              <div className="relative z-10">
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} ${feature.iconColor} mb-5 ring-1 ring-black/5`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-card-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
