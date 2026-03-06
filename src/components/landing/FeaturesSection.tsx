import { MessageSquare, Users, Zap, BarChart3, Code, Shield } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: MessageSquare,
    title: "Real-time resolutions",
    description: "Instant AI responses that understand context and resolve customer queries in seconds, not hours.",
  },
  {
    icon: Users,
    title: "Personalized interactions",
    description: "Tailor conversations based on visitor behavior, preferences, and history for a human-like experience.",
  },
  {
    icon: Zap,
    title: "Leverage conversational AI",
    description: "Powered by frontier models to handle complex queries, multi-turn conversations, and nuanced requests.",
  },
  {
    icon: Shield,
    title: "Support agent efficiency",
    description: "Route complex issues to humans while AI handles routine queries. Reduce support costs by up to 70%.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid gap-16 md:grid-cols-2 items-start max-w-6xl mx-auto">
          {/* Left heading */}
          <div className="sticky top-24">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-foreground md:text-4xl leading-tight"
            >
              What does a conversational AI chatbot offer your business?
            </motion.h2>
          </div>

          {/* Right feature cards */}
          <div className="grid gap-8 sm:grid-cols-2">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-3"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
