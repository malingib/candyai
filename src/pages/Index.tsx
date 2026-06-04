import { Helmet } from "react-helmet-async";
import { lazy, Suspense, useRef } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check, Code2, Cpu, Rocket, Sparkles } from "lucide-react";

const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
const ProductsSection = lazy(() => import("@/components/landing/ProductsSection"));
const DemoChatWidget = lazy(() => import("@/components/landing/DemoChatWidget"));
const Footer = lazy(() => import("@/components/landing/Footer"));

const CountUp = ({ value, label }: { value: string; label: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-3xl md:text-4xl font-black text-foreground"
        >
          {value}
        </motion.div>
        <div className="text-sm text-muted-foreground mt-1 font-medium">{label}</div>
      </motion.div>
    </div>
  );
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

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
      <section className="py-16 bg-muted/30 border-y border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <CountUp value="80%" label="Queries auto-resolved" />
            <CountUp value="&lt;3s" label="Avg response time" />
            <CountUp value="500+" label="Businesses trust us" />
            <CountUp value="99.9%" label="Uptime SLA" />
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-32" />}>
        <FeaturesSection />
      </Suspense>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white opacity-[0.02]" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-[100px]" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-2xl mx-auto text-center mb-16"
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-semibold text-primary uppercase tracking-wider mb-3"
            >
              How it works
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold text-hero-foreground leading-tight"
            >
              Live in <span className="text-primary">3 simple steps</span>
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto"
          >
            {[
              { step: "01", icon: Rocket, title: "Create your account", description: "Sign up in 30 seconds. No credit card needed. Get 20 free chats." },
              { step: "02", icon: Cpu, title: "Train your AI agent", description: "Upload your FAQs, docs, and product info. Your AI learns instantly." },
              { step: "03", icon: Code2, title: "Embed & go live", description: "Copy one line of code. Paste on your site. Start converting." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeInUp}
                className="text-center relative group"
              >
                <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-primary/30 to-transparent -z-0" style={{ display: i < 2 ? undefined : "none" }} />
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg shadow-primary/25"
                  >
                    <item.icon className="h-6 w-6" />
                  </motion.div>
                  <div className="absolute -top-2 -right-2 md:right-auto md:-top-3 md:-left-3 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary backdrop-blur-sm">
                    {item.step}
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-bold text-hero-foreground">{item.title}</h3>
                <p className="text-sm text-hero-muted leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-12"
          >
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-12 font-semibold gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group"
              >
                Start building now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Developer section */}
      <section id="demo" className="py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-30" />
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-primary/3 rounded-full blur-[150px]" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={fadeInUp}>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                For developers
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                Build in <span className="text-gradient">minutes</span>, not weeks
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                One line of code to embed. Full API access for custom integrations.
                Webhooks, event streaming, and SDKs coming soon.
              </p>
              <ul className="space-y-3 mb-8">
                {["One-line embed code", "REST API for custom flows", "Real-time webhook events", "Full conversation history API"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground font-medium">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-semibold gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group"
                >
                  Get API access
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-500"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/70" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <span className="h-3 w-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-xs text-muted-foreground ml-2 font-mono">embed.html</span>
              </div>
              <pre className="p-5 text-sm font-mono text-foreground leading-relaxed overflow-x-auto bg-gradient-to-br from-muted/20 to-background">
                <code>{`<!-- Add to your website -->
<script
  src="https://mobiwave.ai/widget.js"
  data-business-id="YOUR_ID"
  async
></script>

<!-- That's it. Your AI agent is live. -->`}</code>
              </pre>
            </motion.div>
          </motion.div>
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
