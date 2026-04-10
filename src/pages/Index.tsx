import { Helmet } from "react-helmet-async";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import ProductsSection from "@/components/landing/ProductsSection";
import DemoChatWidget from "@/components/landing/DemoChatWidget";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mobiwave AI — AI Customer Support That Never Sleeps</title>
        <meta name="description" content="Deploy AI agents that resolve 80% of support queries instantly. Capture leads, close sales, and delight customers 24/7. Start free today." />
        <link rel="canonical" href="https://candyai.lovable.app/" />
        <meta property="og:title" content="Mobiwave AI — AI Customer Support That Never Sleeps" />
        <meta property="og:description" content="Deploy AI agents that resolve 80% of support queries instantly. Capture leads, close sales, and delight customers 24/7." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://candyai.lovable.app/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mobiwave AI — AI Customer Support That Never Sleeps" />
        <meta name="twitter:description" content="Deploy AI agents that resolve 80% of support queries instantly. Capture leads, close sales, and delight customers 24/7." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Mobiwave AI",
          "applicationCategory": "BusinessApplication",
          "description": "AI-powered customer support chatbot platform for businesses. Automate support, capture leads, and boost sales 24/7.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "operatingSystem": "Web"
        })}</script>
      </Helmet>

      <Navbar />
      <HeroSection />

      {/* Metrics bar */}
      <section className="py-12 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-center">
            {[
              { value: "80%", label: "Queries resolved by AI" },
              { value: "<3s", label: "Average response time" },
              { value: "500+", label: "Businesses using it" },
              { value: "98%", label: "Customer satisfaction" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-extrabold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturesSection />

      {/* How it works */}
      <section id="demo" className="py-20 md:py-28 bg-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-hero-foreground leading-tight">
              Live in 3 steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Sign up", description: "Create your free account. No credit card needed." },
              { step: "2", title: "Add knowledge", description: "Upload FAQs, docs, and product info." },
              { step: "3", title: "Embed & go", description: "Paste one line of code on your site." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="mb-1 text-base font-semibold text-hero-foreground">{item.title}</h3>
                <p className="text-sm text-hero-muted">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />
      <ProductsSection />
      <PricingSection />
      <Footer />
      <DemoChatWidget />
    </div>
  );
};

export default Index;
