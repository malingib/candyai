# Welcome to Candy AI

## Project info

**URL**: https://ai.mobiwwave.co.ke

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Production Notes

- Set `VITE_CLOUDFLARE_ANALYTICS_TOKEN` to enable Cloudflare Web Analytics beacon.
- Admin tools are available at `/dashboard/admin` for users with `admin` role.
- Paystack endpoints:
  - Callback URL: `https://mobiwaveai.co.ke/dashboard/billing?checkout=success`
  - Webhook URL: `https://pjplcsuyhybwoinlwnnb.supabase.co/functions/v1/paystack-webhook`
- Cloudflare hardening/setup guide:
  - `docs/CLOUDFLARE_SETUP.md`
- Cloudflare Pages deploy fix (Vite 5):
  - `docs/CLOUDFLARE_PAGES_DEPLOY.md`
- Privacy/compliance route:
  - `/legal/privacy`
