import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bot, GitBranch, ArrowRight, Code2, MessageSquare, Sparkles, Check } from "lucide-react";
import { motion } from "framer-motion";

const products = [
  {
    icon: MessageSquare,
    title: "AI Web Agent",
    description: "Embed an intelligent chat widget on your website. It learns from your knowledge base and handles customer queries, captures leads, and qualifies prospects — 24/7.",
    features: ["Trainable on your data", "Lead capture built-in", "Multi-language support", "One-line embed code"],
    cta: "Deploy your agent",
    link: "/auth",
    gradient: "from-blue-500 to-indigo-600",
    lightGradient: "from-blue-500/10 to-indigo-500/5",
  },
  {
    icon: Bot,
    title: "AI Chat Assistant",
    description: "A powerful ChatGPT-style interface for your team. Multi-thread conversations, streaming responses, code highlighting, and file uploads.",
    features: ["Persistent threads", "Real-time streaming", "Code highlighting", "GPT-5 & Gemini Pro"],
    cta: "Try AI Chat",
    link: "/chat",
    gradient: "from-purple-500 to-pink-600",
    lightGradient: "from-purple-500/10 to-pink-500/5",
  },
  {
    icon: GitBranch,
    title: "GitHub Code Review Bot",
    description: "AI reviews every pull request automatically. Catches bugs, security issues, and style problems before they reach production.",
    features: ["Auto-review on PR open", "Inline diff comments", "Security scanning", "Review history"],
    cta: "Set up bot",
    link: "/dashboard/github-bot",
    gradient: "from-emerald-500 to-teal-600",
    lightGradient: "from-emerald-500/10 to-teal-500/5",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const ProductsSection = () => {
  return (
    <section id="products" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Products
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Three products. One platform.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 leading-relaxed">
              From customer support to code reviews — AI tools built for African businesses.
            </p>
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto"
        >
          {products.map((product) => (
            <motion.div
              key={product.title}
              variants={cardVariants}
              className="group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-8 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${product.lightGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${product.gradient} text-white mb-5 shadow-lg`}>
                  <product.icon className="h-5 w-5" />
                </div>

                <h3 className="text-lg font-bold text-card-foreground mb-3">{product.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed flex-1">{product.description}</p>

                <ul className="space-y-3 mb-8">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative z-10 mt-auto">
                <Link to={product.link}>
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl font-medium h-11 border-border/60 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary/90 group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
                  >
                    {product.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ProductsSection;
