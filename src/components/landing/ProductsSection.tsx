import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MessageSquare, GitBranch, ArrowRight, Bot, Code2, Sparkles, BarChart3, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const whyChoose = [
  {
    icon: Headphones,
    title: "Multi-channel support",
    description: "Deploy AI across your website, WhatsApp, and more. One platform, every channel your customers use.",
  },
  {
    icon: Bot,
    title: "Automate your conversations",
    description: "AI handles first-line queries 24/7 so your team can focus on complex issues that need a human touch.",
  },
  {
    icon: BarChart3,
    title: "Data-driven reporting",
    description: "Track performance, analyze conversation patterns, and make informed decisions with detailed analytics.",
  },
];

const products = [
  {
    icon: Bot,
    title: "AI Chat Assistant",
    tagline: "Your own ChatGPT-style AI",
    description: "Multi-conversation threads, streaming responses, markdown rendering. A full AI chat experience.",
    features: ["Persistent threads", "Real-time streaming", "Code highlighting", "Powered by Gemini & GPT"],
    cta: "Try AI Chat",
    link: "/chat",
    accent: true,
  },
  {
    icon: GitBranch,
    title: "GitHub Code Review Bot",
    tagline: "AI-powered PR reviews",
    description: "Connect your repos and let AI review every pull request with inline comments on bugs and security.",
    features: ["Auto-review on PR open", "Inline diff comments", "Security detection", "Review history log"],
    cta: "Set Up Bot",
    link: "/dashboard/github-bot",
    accent: false,
  },
];

const ProductsSection = () => {
  return (
    <section id="products" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Why Choose section */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
            Why choose Mobiwave AI?
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mb-24">
          {whyChoose.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center space-y-3"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mx-auto">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Products */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-4">
            <Sparkles className="h-4 w-4" />
            AI Tools
          </div>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
            More AI Tools for Your Business
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          {products.map((product, i) => (
            <motion.div
              key={product.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`rounded-2xl border p-8 transition-all hover:shadow-lg ${
                product.accent
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-card-foreground border-border"
              }`}
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                product.accent ? "bg-accent/20" : "bg-accent/10"
              }`}>
                <product.icon className={`h-6 w-6 ${product.accent ? "text-accent" : "text-accent"}`} />
              </div>

              <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                product.accent ? "opacity-60" : "text-muted-foreground"
              }`}>
                {product.tagline}
              </p>
              <h3 className="text-xl font-bold mb-3">{product.title}</h3>
              <p className={`text-sm mb-5 ${product.accent ? "opacity-70" : "text-muted-foreground"}`}>
                {product.description}
              </p>

              <ul className="space-y-2 mb-6">
                {product.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${
                    product.accent ? "opacity-80" : "text-muted-foreground"
                  }`}>
                    <Code2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={product.link}>
                <Button className={`gap-2 rounded-full ${
                  product.accent
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "bg-foreground text-background hover:bg-foreground/90"
                }`}>
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
