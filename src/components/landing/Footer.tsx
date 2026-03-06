import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Footer = () => {
  return (
    <>
      {/* CTA Banner */}
      <section className="bg-accent py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-accent-foreground mb-3">
            Get started with Mobiwave AI today
          </h2>
          <p className="text-accent-foreground/70 mb-6">
            Sign up for a free trial to get on board with us.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-accent-foreground text-accent hover:bg-accent-foreground/90 rounded-full px-8 gap-2">
              Start Your Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-3 text-xs text-accent-foreground/50">
            Access to full product. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <span className="text-lg font-bold text-background mb-4 block">Mobiwave AI</span>
              <p className="text-sm text-background/50 leading-relaxed">
                AI-powered web agents for businesses. Capture leads, support customers, grow revenue.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-background mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-background/50">
                <li><a href="#features" className="hover:text-background">Features</a></li>
                <li><a href="#pricing" className="hover:text-background">Pricing</a></li>
                <li><Link to="/chat" className="hover:text-background">AI Chat</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-background mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-background/50">
                <li><a href="#" className="hover:text-background">About</a></li>
                <li><a href="#" className="hover:text-background">Blog</a></li>
                <li><a href="#" className="hover:text-background">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-background mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-background/50">
                <li>hello@mobiwave.co.ke</li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-background/10 pt-8 text-center text-sm text-background/30">
            © {new Date().getFullYear()} Mobiwave AI. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
