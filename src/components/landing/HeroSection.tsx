import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Sparkles, MessageSquare, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import heroBotImg from "@/assets/hero-bot.png";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-hero min-h-screen flex items-center">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 md:pt-32 md:pb-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-6"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Customer Engagement
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-hero-foreground md:text-6xl lg:text-7xl"
            >
              Revolutionize{" "}
              <span className="text-accent">Business</span>{" "}
              With Chatbots
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8 text-lg text-hero-muted md:text-xl max-w-lg leading-relaxed"
            >
              Deploy intelligent AI agents that handle customer support, capture leads, and boost sales — 24/7, across every channel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/auth">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 h-13 text-base gap-2 shadow-lg shadow-accent/20">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-13 text-base border-hero-muted/30 text-hero-foreground hover:bg-white/5 bg-transparent">
                  View Demo
                </Button>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex gap-8 mt-12"
            >
              {[
                { value: "10K+", label: "Active Users" },
                { value: "98%", label: "Satisfaction" },
                { value: "24/7", label: "Support" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-accent">{stat.value}</div>
                  <div className="text-sm text-hero-muted">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - floating bot illustration + chat bubbles */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden md:block"
          >
            {/* Glow behind bot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

            {/* Bot image */}
            <div className="relative z-10 flex justify-center">
              <img src={heroBotImg} alt="AI Chatbot" className="w-72 h-72 object-contain animate-float drop-shadow-2xl" />
            </div>

            {/* Floating chat bubbles */}
            <div className="absolute top-4 -left-4 animate-float-slow z-20">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xl max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-medium text-accent">AI Agent</span>
                </div>
                <p className="text-xs text-hero-foreground/80">Hi! How can I help you today? 👋</p>
              </div>
            </div>

            <div className="absolute bottom-8 -right-4 animate-float z-20" style={{ animationDelay: "2s" }}>
              <div className="bg-accent/20 backdrop-blur-sm border border-accent/20 rounded-2xl rounded-br-sm px-4 py-3 shadow-xl max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-3.5 w-3.5 text-hero-foreground/60" />
                  <span className="text-xs font-medium text-hero-foreground/60">Customer</span>
                </div>
                <p className="text-xs text-hero-foreground/80">I need help with my order</p>
              </div>
            </div>

            <div className="absolute top-1/2 right-0 animate-float-slow z-20" style={{ animationDelay: "1s" }}>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <span className="text-xs text-hero-foreground/80 font-medium">Response in 0.3s</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 80L48 74.7C96 69.3 192 58.7 288 53.3C384 48 480 48 576 50.7C672 53.3 768 58.7 864 58.7C960 58.7 1056 53.3 1152 50.7C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="hsl(var(--background))" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
