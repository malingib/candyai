# Cloudflare Pages Deploy Fix (Vite 5)

Your build is successful. The failure is from using `wrangler deploy`, which targets Workers and expects a Vite 6+ auto-config path.

Use Cloudflare **Pages** static deploy instead.

## Cloudflare project settings

In Cloudflare Pages project (`candyai`):

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Deploy command: **leave empty** (recommended)  
  Do NOT set `npx wrangler deploy`.

If your CI requires a deploy command, use:

```bash
npx wrangler pages deploy dist --project-name candyai
```

## Local/manual deploy command

```bash
npm run deploy:pages
```

## Why this works

- `wrangler deploy` = Worker runtime deploy path.
- `wrangler pages deploy` = static Pages deploy path.
- Your repo is a static frontend + Supabase backend, so Pages path is correct.
