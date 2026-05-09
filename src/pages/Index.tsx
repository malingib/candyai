import { Helmet } from "react-helmet-async";
import { lazy, Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

import { ArrowRight, Check } from "lucide-react";

const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
const ProductsSection = lazy(() => import("@/components/landing/ProductsSection"));
const DemoChatWidget = lazy(() => import("@/components/landing/DemoChatWidget"));
const Footer = lazy(() => import("@/components/landing/Footer"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mobiwave AI — AI Customer Support That Converts | Built for Africa</title>
        <meta name="description" content="Deploy AI agents that resolve 80% of support queries instantly. Capture leads, close sales, and delight customers 24/7. Trusted by 500+ African businesses." />
        <link rel="canonical" href="https://candyai.lovable.app/" />
        <meta property="og:title" content="Mobiwave AI — AI Customer Support That Converts" />
        <meta property="og:description" content="Deploy AI agents that resolve 80% of support queries instantly. Capture leads, close sales, and delight customers 24/7." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://candyai.lovable.app/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mobiwave AI — AI Customer Support That Converts" />
        <meta name="twitter:description" content="Deploy AI agents that resolve 80% of support queries instantly." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Mobiwave AI",
          "applicationCategory": "BusinessApplication",
          "description": "AI-powered customer support platform for African businesses. Automate support, capture leads, and boost sales 24/7.",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "operatingSystem": "Web"
        })}</script>
      </Helmet>

      <Navbar />
      <HeroSection />

      {/* Metrics bar */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: "80%", label: "Queries auto-resolved" },
              { value: "<3s", label: "Avg response time" },
              { value: "500+", label: "Businesses trust us" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-black text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-32" />}><FeaturesSection /></Suspense>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32 bg-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-hero-foreground leading-tight">
              Live in 3 simple steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Create your account", description: "Sign up in 30 seconds. No credit card needed. Get 20 free chats." },
              { step: "02", title: "Train your AI agent", description: "Upload your FAQs, docs, and product info. Your AI learns instantly." },
              { step: "03", title: "Embed & go live", description: "Copy one line of code. Paste on your site. Start converting." },
            ].map((item) => (
              <div key={item.step} className="text-center relative">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-lg">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-bold text-hero-foreground">{item.title}</h3>
                <p className="text-sm text-hero-muted leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-12 font-semibold gap-2">
                Start building now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Developer section */}
      <section id="demo" className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                For developers
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                Build in minutes, not weeks
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                One line of code to embed. Full API access for custom integrations.
                Webhooks, event streaming, and SDKs coming soon.
              </p>
              <ul className="space-y-3 mb-8">
                {["One-line embed code", "REST API for custom flows", "Real-time webhook events", "Full conversation history API"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground font-medium">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-semibold gap-2">
                  Get API access <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-hero overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <span className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-hero-muted ml-2 font-mono">embed.html</span>
              </div>
              <pre className="p-5 text-sm font-mono text-hero-foreground leading-relaxed overflow-x-auto">
                <code>{`<!-- Add to your website -->
<script
  src="https://mobiwave.ai/widget.js"
  data-business-id="YOUR_ID"
  async
></script>

<!-- That's it. Your AI agent is live. -->`}</code>
              </pre>
            </motion.div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-32" />}>
        <TestimonialsSection />
        <ProductsSection />
        <PricingSection />
        <Footer />
        <DemoChatWidget />
      </Suspense>
    </div>
  );
};

export default Index;
