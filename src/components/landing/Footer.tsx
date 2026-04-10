import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Footer = () => {
  return (
    <>
      {/* CTA */}
      <section className="bg-hero py-20 border-t border-white/5">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-hero-foreground mb-4">
            Ready to automate your support?
          </h2>
          <p className="text-hero-muted mb-8 max-w-md mx-auto">
            Join 500+ businesses using Mobiwave AI. Set up in under 5 minutes.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 h-12 text-sm font-semibold gap-2 shadow-lg shadow-accent/25">
              Start your free trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-hero-muted/40">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-hero border-t border-white/5 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xs">M</span>
              </div>
              <span className="text-sm font-semibold text-hero-foreground">Mobiwave AI</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-hero-muted">
              <a href="#features" className="hover:text-hero-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-hero-foreground transition-colors">Pricing</a>
              <a href="#products" className="hover:text-hero-foreground transition-colors">Products</a>
              <Link to="/chat" className="hover:text-hero-foreground transition-colors">AI Chat</Link>
            </div>

            <p className="text-xs text-hero-muted/30">
              © {new Date().getFullYear()} Mobiwave AI
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
