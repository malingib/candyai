import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MessageSquare, GitBranch, ArrowRight, Bot, Code2, Sparkles } from "lucide-react";

const products = [
  {
    icon: Bot,
    title: "AI Chat Assistant",
    tagline: "Your own ChatGPT-style AI",
    description:
      "Multi-conversation threads, streaming responses, markdown rendering. A full AI chat experience powered by frontier models.",
    features: ["Persistent conversation threads", "Real-time streaming", "Markdown & code blocks", "Powered by Gemini & GPT"],
    cta: "Try AI Chat",
    link: "/chat",
    accent: true,
  },
  {
    icon: GitBranch,
    title: "GitHub Code Review Bot",
    tagline: "AI-powered PR reviews",
    description:
      "Connect your repos and let AI review every pull request. Get inline comments on bugs, security issues, and best practices.",
    features: ["Auto-review on PR open", "Inline diff comments", "Security & bug detection", "Custom review rules"],
    cta: "Set Up Bot",
    link: "/dashboard/github-bot",
    accent: false,
  },
];

const ProductsSection = () => {
  return (
    <section id="products" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-4">
            <Sparkles className="h-4 w-4" />
            New Products
          </div>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
            More AI Tools for Your Business
          </h2>
          <p className="text-muted-foreground text-lg">
            Beyond customer support — explore our full suite of AI-powered developer and business tools.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          {products.map((product) => (
            <div
              key={product.title}
              className={`rounded-2xl border p-8 transition-all hover:shadow-lg ${
                product.accent
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground border-border"
              }`}
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                product.accent ? "bg-accent/20" : "bg-accent/10"
              }`}>
                <product.icon className={`h-6 w-6 ${product.accent ? "text-accent" : "text-accent"}`} />
              </div>

              <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                product.accent ? "text-primary-foreground/60" : "text-muted-foreground"
              }`}>
                {product.tagline}
              </p>
              <h3 className="text-xl font-bold mb-3">{product.title}</h3>
              <p className={`text-sm mb-5 ${
                product.accent ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}>
                {product.description}
              </p>

              <ul className="space-y-2 mb-6">
                {product.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${
                    product.accent ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}>
                    <Code2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={product.link}>
                <Button
                  className={`gap-2 ${
                    product.accent
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {product.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
