import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

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
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Trusted by businesses
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Don't take our word for it
            </h2>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-7 relative"
            >
              <Quote className="h-8 w-8 text-primary/10 absolute top-6 right-6" />
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-card-foreground leading-relaxed mb-6">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {t.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
