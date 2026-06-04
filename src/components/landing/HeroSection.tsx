import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import productMockup from "@/assets/product-mockup.jpg";

const HeroSection = () => {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-background min-h-[90vh] flex items-center">
      <div className="absolute inset-0 bg-dot-grid" />
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-[120px]" />

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0 }}
        animate={reduceMotion ? undefined : { opacity: 0.15, scale: 1 }}
        transition={reduceMotion ? undefined : { duration: 2, ease: "easeOut" }}
        className="absolute top-20 left-[20%] w-64 h-64 border border-primary/20 rounded-full"
        style={{ animation: "float 8s ease-in-out infinite" }}
      />
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0 }}
        animate={reduceMotion ? undefined : { opacity: 0.1, scale: 1 }}
        transition={reduceMotion ? undefined : { duration: 2.5, delay: 0.5, ease: "easeOut" }}
        className="absolute bottom-40 right-[15%] w-48 h-48 border border-purple-500/20 rounded-full"
        style={{ animation: "float-slow 10s ease-in-out infinite" }}
      />
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0 }}
        animate={reduceMotion ? undefined : { opacity: 0.08 }}
        transition={reduceMotion ? undefined : { duration: 2, delay: 1 }}
        className="absolute top-1/2 right-[25%] w-16 h-16 bg-primary rounded-full blur-xl"
        style={{ animation: "float 7s ease-in-out infinite 2s" }}
      />

      <div className="container mx-auto px-4 pt-28 pb-8 md:pt-36 md:pb-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="hero-fade-up flex justify-center">
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reduceMotion ? undefined : { delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8 backdrop-blur-sm"
            >
              <Zap className="h-3.5 w-3.5" />
              Now powered by GPT-5 & Gemini Pro
            </motion.div>
          </div>

          <h1 className="hero-fade-up hero-fade-up-d1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-foreground mb-6 text-balance">
            AI customer support
            <br />
            <span className="text-gradient">that converts</span>
          </h1>

          <p className="hero-fade-up hero-fade-up-d2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy AI agents that resolve 80% of queries instantly. Capture leads,
            close sales, and delight customers — all on autopilot.
          </p>

          <div className="hero-fade-up hero-fade-up-d3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/auth" className="group">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-10 h-14 text-lg font-semibold gap-3 shadow-[0_8px_30px_-5px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_40px_-5px_hsl(var(--primary)/0.6)] transition-all duration-300 min-w-[280px]"
              >
                Start building — it's free
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#demo">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl px-8 h-14 text-lg font-medium gap-3 border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 min-w-[210px]"
              >
                <Play className="h-5 w-5 fill-current" /> Watch demo
              </Button>
            </a>
          </div>

          <p className="hero-fade-in-d5 text-sm text-muted-foreground/60 mb-16">
            No credit card required · Free 20 chats/month · Setup in 5 minutes
          </p>
        </div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 60 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { delay: 0.6, duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl mx-auto relative px-4"
        >
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-sm" />
          <div className="relative rounded-2xl border border-border/60 overflow-hidden shadow-2xl shadow-primary/10 bg-card hero-glow">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500/70" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <span className="h-3 w-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs text-muted-foreground ml-2 font-mono">mobiwave.ai</span>
            </div>
            <img
              src={productMockup}
              srcSet={`${productMockup} 1280w`}
              alt="Mobiwave AI customer support dashboard showing conversation threads and AI chat interface"
              width={1280}
              height={800}
              className="w-full"
              loading="eager"
              decoding="async"
            />
          </div>
          <div className="absolute -bottom-8 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
