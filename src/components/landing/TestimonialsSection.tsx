import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "We reduced our support costs by 65% in the first month. The AI handles most queries better than our junior agents did.",
    name: "Grace Njeri",
    role: "Head of Support, TechVentures KE",
    rating: 5,
  },
  {
    quote: "Setup took 10 minutes. It was answering customer questions accurately within the hour. Genuinely impressive.",
    name: "David Ochieng",
    role: "Founder, ShopEasy",
    rating: 5,
  },
  {
    quote: "Our lead capture rate went up 3x after adding the AI chat widget. It qualifies leads while we sleep.",
    name: "Amina Hassan",
    role: "Marketing Director, Zuri Digital",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 md:py-28 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            Customer stories
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Businesses that switched to AI support
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-card-foreground leading-relaxed mb-6">
                "{t.quote}"
              </p>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
