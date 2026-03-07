import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
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
      <Navbar />
      <HeroSection />
      <FeaturesSection />

      {/* How it works */}
      <section id="demo" className="py-20 md:py-28 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        <div className="container mx-auto px-4 relative z-10">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-hero-foreground md:text-5xl mb-4"
            >
              Live in <span className="text-accent">3 Steps</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-hero-muted text-lg"
            >
              Get your AI agent running in under 5 minutes.
            </motion.p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Sign Up", description: "Create your free account. No credit card needed." },
              { step: "2", title: "Add Knowledge", description: "Upload your FAQs, products, and business info." },
              { step: "3", title: "Embed & Go", description: "Copy one line of code. Paste on your website. Done." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-bold text-2xl shadow-lg shadow-accent/20">
                  {item.step}
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px border-t-2 border-dashed border-hero-muted/20" />
                )}
                <h3 className="mb-2 text-lg font-semibold text-hero-foreground">{item.title}</h3>
                <p className="text-sm text-hero-muted">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ProductsSection />
      <PricingSection />
      <Footer />
      <DemoChatWidget />
    </div>
  );
};

export default Index;
