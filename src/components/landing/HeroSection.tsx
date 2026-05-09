import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import productMockup from "@/assets/product-mockup.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/[0.04] rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 pt-32 pb-8 md:pt-40 md:pb-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="hero-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8">
              <Zap className="h-3.5 w-3.5" />
              Now powered by GPT-5 & Gemini Pro
            </div>
          </div>

          <h1 className="hero-fade-up hero-fade-up-d1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-foreground mb-6">
            AI customer support
            <br />
            <span className="text-gradient">that converts</span>
          </h1>

          <p className="hero-fade-up hero-fade-up-d2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy AI agents that resolve 80% of queries instantly. Capture leads,
            close sales, and delight customers — all on autopilot.
          </p>

          <div className="hero-fade-up hero-fade-up-d3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-10 h-14 text-lg font-semibold gap-3 shadow-lg shadow-primary/20 min-w-[280px]">
                Start building — it's free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="rounded-xl px-8 h-14 text-lg font-medium gap-3 border-border min-w-[210px]">
                <Play className="h-5 w-5 fill-current" /> Watch demo
              </Button>
            </a>
          </div>

          <p className="hero-fade-in-d5 text-sm text-muted-foreground/60 mb-16">
            No credit card required · Free 20 chats/month · Setup in 5 minutes
          </p>
        </div>

        {/* Product screenshot */}
        <div className="hero-fade-up hero-fade-up-d4 max-w-5xl mx-auto relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
          <div className="relative rounded-2xl border border-border overflow-hidden shadow-2xl shadow-primary/10 bg-card">
            <img
              src={productMockup}
              alt="Mobiwave AI customer support dashboard showing conversation threads and AI chat interface"
              width={1280}
              height={800}
              className="w-full"
              loading="eager"
            />
          </div>
          <div className="absolute -bottom-8 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
