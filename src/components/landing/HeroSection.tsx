import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-primary py-20 md:py-32">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'linear-gradient(hsl(150 60% 40% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(150 60% 40% / 0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-sm text-secondary">
            <MessageSquare className="h-4 w-4" />
            AI-Powered Web Agent for Kenyan SMEs
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-primary-foreground md:text-6xl">
            AI Sales & Support Agent{" "}
            <span className="text-secondary">for Your Website</span>
          </h1>

          <p className="mb-8 text-lg text-primary-foreground/70 md:text-xl">
            Capture leads, answer questions 24/7, and automate customer follow-ups.
            Embed on any website in 60 seconds. Built for Kenyan businesses.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 text-base px-8">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 text-base px-8">
                Try Live Demo
              </Button>
            </a>
          </div>

          <p className="mt-4 text-sm text-primary-foreground/50">
            No credit card required · 50 free chats/month
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
