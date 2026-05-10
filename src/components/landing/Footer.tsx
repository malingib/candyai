import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Footer = () => {
  return (
    <>
      {/* CTA */}
      <section className="bg-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />
        <div className="container mx-auto px-4 text-center max-w-2xl relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-hero-foreground mb-4">
            Ready to transform your support?
          </h2>
          <p className="text-hero-muted mb-8 max-w-md mx-auto text-lg">
            Join 500+ businesses using Mobiwave AI. Set up in under 5 minutes.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-13 text-base font-semibold gap-2 shadow-lg shadow-primary/30">
              Start your free trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-5 text-sm text-hero-muted/50">
            No credit card required · 20 free chats/month · Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-hero border-t border-white/5 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Mobiwave AI" className="h-8 w-8" />
              <span className="text-base font-bold text-hero-foreground">Mobiwave<span className="text-primary">.</span></span>
            </div>

            <div className="flex items-center gap-8 text-sm text-hero-muted">
              <a href="#features" className="hover:text-hero-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-hero-foreground transition-colors">Pricing</a>
              <a href="#products" className="hover:text-hero-foreground transition-colors">Products</a>
              <Link to="/chat" className="hover:text-hero-foreground transition-colors">AI Chat</Link>
              <Link to="/legal/privacy" className="hover:text-hero-foreground transition-colors">Privacy</Link>
            </div>

            <p className="text-xs text-hero-muted/40">
              © {new Date().getFullYear()} Mobiwave Innovations. Nairobi, Kenya.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
