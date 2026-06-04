import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Products", href: "#products" },
  { label: "Pricing", href: "#pricing" },
  { label: "AI Chat", href: "/chat", internal: true },
  { label: "Privacy", href: "/legal/privacy", internal: true },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-[0_1px_30px_-10px_hsl(var(--primary)/0.1)]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 md:h-18 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <img src="/logo.png" alt="Mobiwave AI" className="h-8 w-8 relative z-10" />
            <div className="absolute inset-0 blur-md bg-primary/20 rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            Mobiwave<span className="text-primary">.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) =>
            link.internal ? (
              <Link
                key={link.label}
                to={link.href}
                className="relative px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                {link.label}
              </a>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-sm font-medium h-9"
            >
              Log in
            </Button>
          </Link>
          <Link to="/auth">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 text-sm h-9 font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              Start free
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden relative z-50 flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col h-full pt-24 px-6 pb-8">
              <nav className="flex-1 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {link.internal ? (
                      <Link
                        to={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-3.5 text-lg font-medium text-foreground hover:bg-primary/5 rounded-xl transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-3.5 text-lg font-medium text-foreground hover:bg-primary/5 rounded-xl transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </motion.div>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 pt-6 border-t border-border"
              >
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="block">
                  <Button variant="outline" size="lg" className="w-full rounded-xl h-12 text-base">
                    Log in
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="block">
                  <Button
                    size="lg"
                    className="w-full rounded-xl h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                  >
                    Start free
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
