# Production Deployment Checklist - Candy AI

## 1. Environment Variables & Secrets
### Supabase Edge Functions (Secrets)
- [ ] `SUPABASE_URL`: Your Supabase project URL.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: For administrative tasks.
- [ ] `SUPABASE_JWT_SECRET`: To sign/verify guest tokens for the widget.
- [ ] `PAYSTACK_SECRET_KEY`: From your Paystack dashboard.
- [ ] `LOVABLE_API_KEY`: For AI chat and embeddings.
- [ ] `APP_SITE_URL`: Base URL of your frontend (e.g., https://mobiwaveai.co.ke).
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: For sending ticket emails.

### Frontend (Vite Env)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_CLOUDFLARE_ANALYTICS_TOKEN` (Optional)

## 2. Database Setup
- [ ] Run all migrations in `supabase/migrations/` in order.
- [ ] Verify `billing_plans` table is populated with current pricing.
- [ ] Ensure RLS is enabled on all tables and policies match `user_id` isolation.

## 3. Widget Security & Verification
- [ ] Verify `public/widget.js` is accessible at the root of your deployment.
- [ ] Test domain registration and verification workflow in the dashboard.
- [ ] Ensure CORS headers in Edge Functions allow your production domain.

## 4. Billing Integration (Paystack)
- [ ] Configure Paystack Webhook: `https://<project-ref>.supabase.co/functions/v1/paystack-webhook`
- [ ] Configure Paystack Callback: `https://mobiwaveai.co.ke/dashboard/billing?checkout=success`
- [ ] Test M-Pesa STK push with a test number in sandbox mode.

## 5. Performance & Monitoring
- [ ] Ensure composite indexes from `20260427000001_add_performance_indexes.sql` are applied.
- [ ] Set up log pruning via `public.prune_old_logs` cron (if supported by your PG hosting).
