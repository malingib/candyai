import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "We reduced our support costs by 65% in the first month. The AI handles most queries better than our junior agents did.",
    name: "Grace Njeri",
    role: "Head of Support, TechVentures KE",
    rating: 5,
    initials: "GN",
  },
  {
    quote: "Setup took 10 minutes. It was answering customer questions accurately within the hour. Genuinely impressive.",
    name: "David Ochieng",
    role: "Founder, ShopEasy",
    rating: 5,
    initials: "DO",
  },
  {
    quote: "Our lead capture rate went up 3x after adding the AI chat widget. It qualifies leads while we sleep.",
    name: "Amina Hassan",
    role: "Marketing Director, Zuri Digital",
    rating: 5,
    initials: "AH",
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

const TestimonialsSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-30" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/3 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-purple-500/3 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Trusted by businesses
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Don't take our word for it
            </h2>
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={cardVariants}
              className="group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-7 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 transition-all duration-500"
            >
              <span className="absolute top-5 right-6 text-6xl font-serif leading-none text-primary/10 select-none">
                &ldquo;
              </span>

              <motion.div
                className="flex gap-1 mb-5"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {Array.from({ length: t.rating }).map((_, j) => (
                  <motion.span
                    key={j}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + j * 0.1, type: "spring", stiffness: 300 }}
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </motion.span>
                ))}
              </motion.div>

              <p className="text-sm text-card-foreground leading-relaxed mb-6 relative z-10">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 relative z-10">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
