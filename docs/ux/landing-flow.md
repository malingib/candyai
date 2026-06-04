## User Flow: Landing → Embed demo → Sign up

**Entry Point**: User lands on homepage via organic or paid channel

1. Landing hero: value prop + primary CTA "Start building — it's free"
   - Micro-trust line: "Trusted by 500+ African businesses"
2. Demo Chat widget: allow users to try 5 free messages (show remaining up-front)
3. How it works: 3-step integration (Account → Train → Embed)
4. Developer section: one-line embed + code sample
5. Sign up / Auth flow: lightweight signup and verification

**Design Principles**
- Progressive disclosure: critical tasks first (embedding, training)
- Clear progress + verification: show setup checks
- Accessible interactions: keyboard focus, reduced-motion, ARIA live for chat

**Accessibility Checklist (high priority)**
- Add `aria-live="polite"` to chat message region
- Ensure inputs have `aria-label` or visible labels
- Respect `prefers-reduced-motion` for animations
- Visible focus states for all interactive elements

**Developer Handoff**
- Use existing UI primitives from `src/components/ui/`
- Provide responsive screenshots and optimized hero image assets
- Instrument CTAs for analytics
