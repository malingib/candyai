import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyCompliance() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy, Cookies & Communications | Mobiwave AI</title>
        <meta name="description" content="How Mobiwave AI handles personal data, consent, cookies, and communications for users in Kenya." />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Privacy, Cookies & Communications</h1>
          <Link to="/"><Button variant="outline" size="sm">Back</Button></Link>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Data We Collect</h2>
          <p className="text-sm text-muted-foreground">Account and business details, chat and lead records, security logs, and optional analytics events used for product improvement.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Why We Process Data</h2>
          <p className="text-sm text-muted-foreground">To provide AI chat services, secure accounts, prevent abuse, process payments, respond to support requests, and meet legal obligations.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Consent & Cookies</h2>
          <p className="text-sm text-muted-foreground">Essential cookies are required for login and security. Analytics cookies are optional and can be declined. You can withdraw optional consent anytime by clearing preferences and setting them again.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Communications</h2>
          <p className="text-sm text-muted-foreground">Service emails (verification, password reset, billing, security alerts) are always sent when necessary. Optional marketing updates are only sent where consent is provided and can be unsubscribed.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Your Rights</h2>
          <p className="text-sm text-muted-foreground">You may request access, correction, deletion, restriction/objection where applicable, and withdrawal of consent for optional processing, subject to legal and contractual requirements.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Retention & Security</h2>
          <p className="text-sm text-muted-foreground">We retain personal data only as needed for service delivery, legal compliance, dispute resolution, and security. We apply access controls, rate limiting, logging, and encryption in transit.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. Kenya Compliance Basis</h2>
          <p className="text-sm text-muted-foreground">Our controls are designed to align with Kenya's Data Protection Act, 2019 and related regulations, and communications/cybersecurity obligations applicable to online services.</p>
        </section>

        <p className="text-xs text-muted-foreground">Last updated: May 10, 2026</p>
      </div>
    </div>
  );
}
