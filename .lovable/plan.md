

# Mobiwave AI — Web Agent Platform MVP

## 1. Landing Page (Public)
- Hero section: "AI Sales & Support Agent for Your Website" with clear value proposition for Kenyan SMEs
- Live demo chat widget visitors can try (limited to 5 messages without signup)
- Features section: Lead capture, 24/7 AI support, Email integration, Analytics
- Pricing section with 4 tiers:
  - **Free** — 50 chats/month, basic AI, Mobiwave branding
  - **Starter** (KES 1,500/mo) — 500 chats, SMTP email, lead capture, basic analytics
  - **Growth** (KES 3,500/mo) — 2,000 chats, SMS follow-up, remove branding, advanced analytics
  - **Enterprise** (KES 8,000+/mo) — Unlimited chats, API access, priority support
- Call-to-action: "Start Free" signup button
- Footer with links and contact info

## 2. Authentication
- Email/password signup and login
- Protected admin dashboard routes
- User profiles with business name and plan info

## 3. Admin Dashboard (Protected)
- **Overview page**: Chat stats, lead count, usage meter showing chats remaining
- **Conversations page**: View all chat sessions with visitors, read full transcripts
- **Knowledge Base page**: Upload FAQs, product info, and business details that the AI uses to answer questions accurately
- **Settings page**: Configure SMTP email (host, port, credentials), business name, widget appearance (colors, welcome message)
- **Embed Code page**: Copy/paste script snippet for embedding the chat widget on any website
- **Billing page**: Current plan, upgrade options

## 4. AI Chat Engine (Lovable Cloud + Lovable AI)
- Edge function that receives visitor messages, checks usage limits, and calls Lovable AI (Gemini)
- AI uses the business's uploaded knowledge base for context-aware responses
- Intent detection for lead capture: when visitor asks for quotes/contact, AI collects their details
- Leads stored in database and emailed to business via their SMTP settings
- Streaming responses for real-time chat feel
- Rate limiting: free tier capped at 50 chats/month per business

## 5. Database Schema
- **profiles** — business name, plan, chats_used, chats_limit
- **knowledge_base** — business FAQ/product content per user
- **conversations** — chat sessions with visitor metadata
- **messages** — individual messages (role, content, timestamps)
- **leads** — captured visitor contact info
- **smtp_settings** — encrypted email configuration per business

## 6. Embeddable Widget (Future-Ready)
- A simple chat bubble component that can be served as a standalone script
- For now, the demo widget lives on the landing page; standalone embed script comes in Phase 2

## Design Direction
- Clean, professional look — dark navy + white + accent green (Kenyan-tech feel)
- Mobile-responsive throughout
- Simple, fast-loading pages — no unnecessary animations

