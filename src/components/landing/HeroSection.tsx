import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Bot, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";

const HeroSection = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(40 40% 96%) 0%, hsl(38 60% 90%) 60%, hsl(38 50% 85%) 100%)" }}>
      {/* Top banner */}
      <div className="bg-accent/10 border-b border-accent/20 py-2 text-center">
        <p className="text-sm text-foreground">
          🎉 <span className="font-semibold">Free 14-day trial</span> - No credit card required
        </p>
      </div>

      <div className="container mx-auto px-4 pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
          >
            Boost sales and support with an{" "}
            <span className="text-accent">AI-powered</span> chatbot
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto"
          >
            Provide instant, AI-powered support and keep customers happy, anytime, anywhere.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="Enter your business email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-card border-border text-base rounded-full px-6"
            />
            <Link to="/auth">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-12 text-base whitespace-nowrap">
                Sign up free
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Chat bubble illustrations */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative mt-16 max-w-lg mx-auto"
        >
          {/* Left bubble - bot response */}
          <div className="absolute -left-4 md:-left-16 top-8 z-10">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg border max-w-[220px]">
                <p className="text-sm text-foreground">Hi! 👋 I can help you with your order. What do you need?</p>
              </div>
            </div>
          </div>

          {/* Right bubble - user question */}
          <div className="absolute -right-4 md:-right-12 top-24 z-10">
            <div className="flex items-start gap-2 flex-row-reverse">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg max-w-[220px]">
                <p className="text-sm">How much time do I have for my order return?</p>
              </div>
            </div>
          </div>

          {/* Right bubble - user thanks */}
          <div className="absolute -right-2 md:-right-8 bottom-4 z-10">
            <div className="flex items-start gap-2 flex-row-reverse">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg">
                <p className="text-sm">That's what I needed! Thx</p>
              </div>
            </div>
          </div>

          {/* Center placeholder area */}
          <div className="h-64 md:h-80 rounded-3xl bg-accent/5 border border-accent/10 flex items-center justify-center">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-accent/10 mx-auto mb-4 flex items-center justify-center">
                <Bot className="h-10 w-10 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Your AI agent, always ready</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
