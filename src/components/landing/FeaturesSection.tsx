import { MessageSquare, Users, Zap, Shield, Bot, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: MessageSquare,
    title: "Real-time Resolutions",
    description: "Instant AI responses that understand context and resolve customer queries in seconds.",
  },
  {
    icon: Users,
    title: "Personalized Interactions",
    description: "Tailor conversations based on visitor behavior and history for a human-like experience.",
  },
  {
    icon: Zap,
    title: "Conversational AI",
    description: "Powered by frontier models to handle complex queries and multi-turn conversations.",
  },
  {
    icon: Shield,
    title: "Agent Efficiency",
    description: "Route complex issues to humans while AI handles routine queries. Cut costs by 70%.",
  },
  {
    icon: Bot,
    title: "Multi-channel Deploy",
    description: "Deploy across website, WhatsApp, and more. One platform, every customer channel.",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Track performance and conversation patterns with detailed, actionable reporting.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-background relative">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-4"
          >
            <Zap className="h-3.5 w-3.5" />
            Features
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-foreground md:text-5xl mb-4"
          >
            Everything You Need to{" "}
            <span className="text-accent">Automate</span> Support
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Powerful AI capabilities designed for modern businesses.
          </motion.p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:shadow-accent/5 hover:border-accent/20"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-4 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
