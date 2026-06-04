import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Twitter, Github, Linkedin, Mail } from "lucide-react";
import { motion } from "framer-motion";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Products", href: "#products" },
      { label: "AI Chat", href: "/chat", internal: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy", href: "/legal/privacy", internal: true },
      { label: "Terms", href: "/legal/terms", internal: true },
      { label: "Contact", href: "mailto:hello@mobiwave.ai" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Mail, href: "mailto:hello@mobiwave.ai", label: "Email" },
];

const Footer = () => {
  return (
    <>
      <section className="bg-hero py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white opacity-[0.02]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />

        <div className="container mx-auto px-4 text-center max-w-2xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-hero-foreground mb-4 leading-tight">
              Ready to transform your support?
            </h2>
            <p className="text-hero-muted mb-8 max-w-md mx-auto text-lg leading-relaxed">
              Join 500+ businesses using Mobiwave AI. Set up in under 5 minutes.
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-10 h-13 text-base font-semibold gap-2 shadow-[0_8px_30px_-5px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_40px_-5px_hsl(var(--primary)/0.6)] transition-all duration-300"
              >
                Start your free trial
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
            <p className="mt-5 text-sm text-hero-muted/40">
              No credit card required · 20 free chats/month · Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      <footer className="bg-hero relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <img src="/logo.png" alt="Mobiwave AI" className="h-8 w-8" />
                <span className="text-base font-bold text-hero-foreground">
                  Mobiwave<span className="text-primary">.</span>
                </span>
              </Link>
              <p className="text-sm text-hero-muted/60 leading-relaxed mb-6 max-w-xs">
                AI-powered customer support that converts. Trusted by 500+ African businesses.
              </p>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target={social.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-hero-muted/60 hover:bg-primary/20 hover:text-primary transition-all duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="text-sm font-semibold text-hero-foreground mb-4">{group.title}</h4>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.internal ? (
                        <Link
                          to={link.href}
                          className="text-sm text-hero-muted/60 hover:text-hero-foreground transition-colors"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-hero-muted/60 hover:text-hero-foreground transition-colors"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-hero-muted/40">
              &copy; {new Date().getFullYear()} Mobiwave Innovations. Nairobi, Kenya.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/legal/privacy" className="text-xs text-hero-muted/40 hover:text-hero-muted/60 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/legal/terms" className="text-xs text-hero-muted/40 hover:text-hero-muted/60 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
