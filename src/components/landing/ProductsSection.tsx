import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bot, GitBranch, ArrowRight, Code2, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const products = [
  {
    icon: MessageSquare,
    title: "AI Web Agent",
    description: "Embed an intelligent chat widget on your website. It learns from your knowledge base and handles customer queries, captures leads, and qualifies prospects — 24/7.",
    features: ["Trainable on your data", "Lead capture built-in", "Multi-language support", "One-line embed code"],
    cta: "Deploy your agent",
    link: "/auth",
    gradient: "from-primary to-blue-600",
  },
  {
    icon: Bot,
    title: "AI Chat Assistant",
    description: "A powerful ChatGPT-style interface for your team. Multi-thread conversations, streaming responses, code highlighting, and file uploads.",
    features: ["Persistent threads", "Real-time streaming", "Code highlighting", "GPT-5 & Gemini Pro"],
    cta: "Try AI Chat",
    link: "/chat",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    icon: GitBranch,
    title: "GitHub Code Review Bot",
    description: "AI reviews every pull request automatically. Catches bugs, security issues, and style problems before they reach production.",
    features: ["Auto-review on PR open", "Inline diff comments", "Security scanning", "Review history"],
    cta: "Set up bot",
    link: "/dashboard/github-bot",
    gradient: "from-emerald-500 to-teal-600",
  },
];

const ProductsSection = () => {
  return (
    <section id="products" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Products
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Three products. One platform.
            </h2>
            <p className="text-lg text-muted-foreground mt-4">
              From customer support to code reviews — AI tools built for African businesses.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto">
          {products.map((product, i) => (
            <motion.div
              key={product.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl border border-border bg-card p-7 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${product.gradient} text-white mb-5`}>
                <product.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground mb-2">{product.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed flex-1">{product.description}</p>

              <ul className="space-y-2.5 mb-6">
                {product.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={product.link}>
                <Button variant="outline" className="w-full gap-2 rounded-xl font-medium group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
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
