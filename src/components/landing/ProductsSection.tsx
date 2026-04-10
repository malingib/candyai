import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bot, GitBranch, ArrowRight, Code2 } from "lucide-react";
import { motion } from "framer-motion";

const products = [
  {
    icon: Bot,
    title: "AI Chat Assistant",
    description: "ChatGPT-style AI for your team. Multi-thread conversations, streaming responses, code highlighting, and file uploads.",
    features: ["Persistent threads", "Real-time streaming", "Code highlighting", "GPT-5 & Gemini Pro"],
    cta: "Try AI Chat",
    link: "/chat",
  },
  {
    icon: GitBranch,
    title: "GitHub Code Review Bot",
    description: "AI reviews every pull request. Catches bugs, security issues, and style problems before they reach production.",
    features: ["Auto-review on PR open", "Inline diff comments", "Security scanning", "Review history"],
    cta: "Set up bot",
    link: "/dashboard/github-bot",
  },
];

const ProductsSection = () => {
  return (
    <section id="products" className="py-20 md:py-28 bg-hero">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            Products
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-hero-foreground leading-tight">
            More AI tools for your workflow
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {products.map((product, i) => (
            <motion.div
              key={product.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-7"
            >
              <product.icon className="h-5 w-5 text-accent mb-4" />
              <h3 className="text-lg font-semibold text-hero-foreground mb-2">{product.title}</h3>
              <p className="text-sm text-hero-muted mb-5 leading-relaxed">{product.description}</p>

              <ul className="space-y-2 mb-6">
                {product.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-hero-muted">
                    <Code2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={product.link}>
                <Button variant="ghost" className="gap-2 text-accent hover:text-accent hover:bg-accent/10 p-0 h-auto font-medium text-sm">
                  {product.cta} <ArrowRight className="h-3.5 w-3.5" />
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
