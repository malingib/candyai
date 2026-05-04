import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import productMockup from "@/assets/product-mockup.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/[0.04] rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 pt-32 pb-8 md:pt-40 md:pb-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8">
              <Zap className="h-3.5 w-3.5" />
              Now powered by GPT-5 & Gemini Pro
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-foreground mb-6"
          >
            AI customer support
            <br />
            <span className="text-gradient">that converts</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Deploy AI agents that resolve 80% of queries instantly. Capture leads,
            close sales, and delight customers — all on autopilot.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-13 text-base font-semibold gap-2 shadow-lg shadow-primary/20">
                Start building — it's free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="rounded-xl px-6 h-13 text-base font-medium gap-2 border-border">
                <Play className="h-4 w-4 fill-current" /> Watch demo
              </Button>
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground/60 mb-16"
          >
            No credit card required · Free 20 chats/month · Setup in 5 minutes
          </motion.p>
        </div>

        {/* Product screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-5xl mx-auto relative"
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
          <div className="relative rounded-2xl border border-border overflow-hidden shadow-2xl shadow-primary/10 bg-card">
            <img
              src={productMockup}
              alt="Mobiwave AI customer support dashboard showing conversation threads and AI chat interface"
              width={1280}
              height={800}
              className="w-full"
              loading="eager"
            />
          </div>
          <div className="absolute -bottom-8 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
