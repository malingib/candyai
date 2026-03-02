import { MessageSquare, Users, Mail, BarChart3, Code, Zap } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Agent",
    description: "Intelligent responses powered by your business knowledge base. Answers FAQs, explains products, and guides visitors.",
  },
  {
    icon: Users,
    title: "Lead Capture",
    description: "Automatically detects purchase intent and collects visitor contact details. Never miss a potential customer.",
  },
  {
    icon: Mail,
    title: "Email Integration",
    description: "Connect your SMTP and get leads delivered straight to your inbox. Auto follow-up emails to warm leads.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track conversations, monitor lead quality, and measure chat performance from one clean dashboard.",
  },
  {
    icon: Code,
    title: "Easy Embed",
    description: "Copy one line of code. Paste on any website. Your AI agent is live in 60 seconds.",
  },
  {
    icon: Zap,
    title: "24/7 Availability",
    description: "Your AI agent never sleeps. Capture leads and support customers around the clock, even on holidays.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
            Everything Your Website Needs
          </h2>
          <p className="text-muted-foreground text-lg">
            One AI agent replaces live chat, contact forms, and FAQ pages.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-accent/50"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
