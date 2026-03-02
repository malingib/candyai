import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import DemoChatWidget from "@/components/landing/DemoChatWidget";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />

      {/* How it works */}
      <section id="demo" className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              Live in 3 Steps
            </h2>
            <p className="text-muted-foreground text-lg">
              Get your AI agent running in under 5 minutes.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Sign Up", description: "Create your free account. No credit card needed." },
              { step: "2", title: "Add Knowledge", description: "Upload your FAQs, products, and business info." },
              { step: "3", title: "Embed & Go", description: "Copy one line of code. Paste on your website. Done." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />
      <Footer />
      <DemoChatWidget />
    </div>
  );
};

export default Index;
