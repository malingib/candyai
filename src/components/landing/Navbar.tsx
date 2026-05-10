import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
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
      scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm" : "bg-transparent"
    }`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Mobiwave AI" className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">
            Mobiwave<span className="text-primary">.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <Link to="/chat" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">AI Chat</Link>
          <Link to="/legal/privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm font-medium">
              Log in
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 text-sm h-9 font-medium shadow-sm">
              Start free →
            </Button>
          </Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="bg-background/98 backdrop-blur-xl border-t border-border px-4 py-4 md:hidden space-y-3">
          <a href="#features" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="#pricing" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
          <Link to="/chat" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>AI Chat</Link>
          <Link to="/legal/privacy" className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Privacy</Link>
          <div className="flex gap-2 pt-2">
            <Link to="/auth" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">Log in</Button>
            </Link>
            <Link to="/auth" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-primary text-primary-foreground">Start free</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
