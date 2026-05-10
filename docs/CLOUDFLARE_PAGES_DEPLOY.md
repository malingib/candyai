# Cloudflare Pages Deploy

This repository is configured for Cloudflare **Pages**, not Workers runtime deploy.

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

## First-time setup (only once per account/project)

Create the Pages project if it does not exist yet:

```bash
npx wrangler pages project create candyai --production-branch main
```

Then deploy:

```bash
npm run deploy:pages
```

## Why this works

- `wrangler deploy` = Worker runtime deploy path.
- `wrangler pages deploy` = static Pages deploy path.
- Your repo is a static frontend + Supabase backend, so Pages path is correct.
