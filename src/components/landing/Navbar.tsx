import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-hero/95 backdrop-blur-lg border-b border-white/5 shadow-lg" : "bg-transparent"
    }`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-sm">M</span>
          </div>
          <span className="text-lg font-bold text-hero-foreground">Mobiwave AI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors">
            Features
          </a>
          <a href="#products" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors">
            Products
          </a>
          <a href="#pricing" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors">
            Pricing
          </a>
          <Link to="/chat" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors">
            AI Chat
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" className="text-hero-muted hover:text-hero-foreground hover:bg-white/5">
              Log in
            </Button>
          </Link>
          <Link to="/auth">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-6">
              Get Started Free
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-hero-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="bg-hero/98 backdrop-blur-lg border-t border-white/5 px-4 py-4 md:hidden space-y-3">
          <a href="#features" className="block text-sm text-hero-muted hover:text-hero-foreground" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#products" className="block text-sm text-hero-muted hover:text-hero-foreground" onClick={() => setMobileOpen(false)}>Products</a>
          <a href="#pricing" className="block text-sm text-hero-muted hover:text-hero-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
          <Link to="/chat" className="block text-sm text-hero-muted hover:text-hero-foreground" onClick={() => setMobileOpen(false)}>AI Chat</Link>
          <Link to="/auth" onClick={() => setMobileOpen(false)}>
            <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
              Get Started Free
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
