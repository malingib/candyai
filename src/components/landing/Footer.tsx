import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare } from "lucide-react";

const Footer = () => {
  return (
    <>
      {/* CTA Banner */}
      <section className="bg-hero py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-accent/8 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent mx-auto mb-6">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-hero-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-hero-muted mb-8 text-lg max-w-md mx-auto">
            Join thousands of businesses already using Mobiwave AI to transform customer engagement.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-10 h-13 text-base gap-2 shadow-lg shadow-accent/20">
              Start Your Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-hero-muted/60">
            No credit card required · 14-day free trial
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-hero border-t border-white/5 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                  <span className="text-accent-foreground font-bold text-sm">M</span>
                </div>
                <span className="text-lg font-bold text-hero-foreground">Mobiwave AI</span>
              </div>
              <p className="text-sm text-hero-muted leading-relaxed">
                AI-powered web agents for businesses. Capture leads, support customers, grow revenue.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-hero-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-hero-muted">
                <li><a href="#features" className="hover:text-accent transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-accent transition-colors">Pricing</a></li>
                <li><Link to="/chat" className="hover:text-accent transition-colors">AI Chat</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-hero-foreground mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-hero-muted">
                <li><a href="#" className="hover:text-accent transition-colors">About</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-hero-foreground mb-4">Contact</h4>
              <ul className="space-y-2.5 text-sm text-hero-muted">
                <li>hello@mobiwave.co.ke</li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/5 pt-8 text-center text-sm text-hero-muted/40">
            © {new Date().getFullYear()} Mobiwave AI. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
