import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import productMockup from "@/assets/product-mockup.jpg";

const logos = [
  "Safaricom", "KCB Bank", "Equity", "NCBA", "M-PESA",
];

const HeroSection = () => {
  return (
    <section className="relative bg-hero overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-accent/[0.07] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 pt-28 pb-4 md:pt-36 md:pb-8 relative z-10">
        {/* Centered hero content */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Now with GPT-5 & Gemini Pro
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight text-hero-foreground mb-6">
            Customer support
            <br />
            <span className="text-accent">that never sleeps</span>
          </h1>

          <p className="text-base md:text-lg text-hero-muted max-w-xl mx-auto mb-8 leading-relaxed">
            Deploy AI agents that resolve 80% of support queries instantly.
            Capture leads, close sales, and delight customers — on autopilot.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link to="/auth">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 h-12 text-sm font-semibold gap-2 shadow-lg shadow-accent/25">
                Start free — no card needed <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="ghost" className="rounded-full px-6 h-12 text-sm font-medium text-hero-muted hover:text-hero-foreground hover:bg-white/5 gap-2">
                <Play className="h-4 w-4 fill-current" /> Watch demo
              </Button>
            </a>
          </div>

          <p className="text-xs text-hero-muted/50 mb-12">
            Trusted by 500+ businesses · 2M+ conversations handled
          </p>
        </div>

        {/* Product screenshot */}
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute -inset-4 bg-gradient-to-t from-hero via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40">
            <img
              src={productMockup}
              alt="Mobiwave AI customer support dashboard showing conversation threads and AI chat interface"
              width={1280}
              height={800}
              className="w-full"
            />
          </div>
        </div>

        {/* Logo bar */}
        <div className="max-w-3xl mx-auto mt-16 mb-8">
          <p className="text-center text-xs uppercase tracking-widest text-hero-muted/40 mb-6">
            Trusted by leading companies
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
            {logos.map((name) => (
              <span key={name} className="text-sm font-semibold text-hero-muted/25 select-none">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
