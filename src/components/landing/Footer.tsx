import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t bg-primary py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <MessageSquare className="h-4 w-4 text-secondary-foreground" />
              </div>
              <span className="text-lg font-bold text-primary-foreground">Mobiwave AI</span>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              AI-powered web agents for Kenyan businesses. Capture leads, support customers, grow revenue.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><a href="#features" className="hover:text-primary-foreground">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary-foreground">Pricing</a></li>
              <li><a href="#demo" className="hover:text-primary-foreground">Demo</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><a href="#" className="hover:text-primary-foreground">About</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Blog</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Careers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li>hello@mobiwave.co.ke</li>
              <li>Nairobi, Kenya</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/10 pt-8 text-center text-sm text-primary-foreground/40">
          © {new Date().getFullYear()} Mobiwave AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
