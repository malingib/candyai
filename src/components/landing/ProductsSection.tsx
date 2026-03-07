import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bot, GitBranch, ArrowRight, Code2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const products = [
  {
    icon: Bot,
    title: "AI Chat Assistant",
    tagline: "Your own ChatGPT-style AI",
    description: "Multi-conversation threads, streaming responses, markdown rendering. A full AI chat experience for your team.",
    features: ["Persistent threads", "Real-time streaming", "Code highlighting", "Powered by Gemini & GPT"],
    cta: "Try AI Chat",
    link: "/chat",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: GitBranch,
    title: "GitHub Code Review Bot",
    tagline: "AI-powered PR reviews",
    description: "Connect your repos and let AI review every pull request with inline comments on bugs and security issues.",
    features: ["Auto-review on PR open", "Inline diff comments", "Security detection", "Review history log"],
    cta: "Set Up Bot",
    link: "/dashboard/github-bot",
    gradient: "from-primary/20 to-primary/5",
  },
];

const ProductsSection = () => {
  return (
    <section id="products" className="py-20 md:py-28 bg-hero relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-20 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-4"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Tools
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-hero-foreground md:text-5xl mb-4"
          >
            More AI Tools for{" "}
            <span className="text-accent">Your Business</span>
          </motion.h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          {products.map((product, i) => (
            <motion.div
              key={product.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 transition-all hover:border-accent/30 hover:bg-white/8`}
            >
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${product.gradient} mb-5`}>
                <product.icon className="h-7 w-7 text-accent" />
              </div>

              <p className="text-xs font-medium uppercase tracking-wider text-accent mb-1">
                {product.tagline}
              </p>
              <h3 className="text-xl font-bold text-hero-foreground mb-3">{product.title}</h3>
              <p className="text-sm text-hero-muted mb-5 leading-relaxed">
                {product.description}
              </p>

              <ul className="space-y-2.5 mb-6">
                {product.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-hero-muted">
                    <Code2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={product.link}>
                <Button className="gap-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {product.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
