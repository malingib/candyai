import { Button } from "@/components/ui/button";
import { MessageSquare, Menu, X, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">Mobiwave AI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            Product <ChevronDown className="h-3 w-3" />
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#products" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            Integrations <ChevronDown className="h-3 w-3" />
          </a>
          <Link to="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">AI Chat</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button className="rounded-full border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background px-6">
              Sign up free
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background px-4 py-4 md:hidden space-y-3">
          <a href="#features" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Product</a>
          <a href="#pricing" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
          <a href="#products" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Integrations</a>
          <Link to="/chat" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>AI Chat</Link>
          <Link to="/auth" onClick={() => setMobileOpen(false)}>
            <Button size="sm" className="w-full rounded-full border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background">
              Sign up free
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
