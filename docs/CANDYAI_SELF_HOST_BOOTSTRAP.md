# CandyAI Self-Hosted Bootstrap and Validation

CandyAI is a Rails/Vue application derived from Chatwoot. It is not a static React/Vite site and should not be deployed as a Vercel frontend. The production runtime needs Rails, PostgreSQL, Redis, and a background worker.

## Baseline

- Source: `candyai/implementation-hardening`
- Ruby: match the repository's `.ruby-version` and `Gemfile` (the current Gemfile specifies Ruby 3.4.4).
- Node/Yarn: match the checked-in Node/Yarn version files and package metadata.
- Database/cache: PostgreSQL and Redis versions supported by the selected Chatwoot source revision.
- Public deployment: Linux host, HTTPS reverse proxy, SMTP, backups, monitoring, and separate worker process.

For current upstream deployment requirements and options, see the [official self-hosted guide](https://www.chatwoot.com/deploy) and [Chatwoot source README](https://github.com/chatwoot/chatwoot/blob/develop/README.md). Do not blindly apply a current upstream config to this older derived branch.

## Local boot sequence

1. Check out `candyai/implementation-hardening` in a clean working tree.
2. Install the repository-pinned Ruby and Node versions.
3. Install and start PostgreSQL and Redis locally. Keep them bound to localhost in development.
4. Copy `.env.example` to an untracked `.env`; generate unique secrets and set database, Redis, frontend URL, mailer, and storage settings. Never commit `.env`, API keys, or production credentials.
5. Install Ruby and JavaScript dependencies using the commands documented for this revision (normally `bundle install` and the repository's package-manager install command).
6. Prepare the database with the Chatwoot task:
   `bundle exec rails db:chatwoot_prepare`
7. Start the web process using the repository's documented development command.
8. Start Sidekiq in a second terminal using the repository's configured Sidekiq command. Background message processing is required for asynchronous AI replies.
9. Visit the local app, create a test account, create an inbox, and confirm a normal non-AI conversation works before enabling CandyAI.

## CandyAI development settings

Set secrets only in the untracked local `.env` or a secret manager:

```dotenv
CANDYAI_ENABLED=true
CANDYAI_BRAND_NAME=CandyAI
CANDYAI_COMPANY_NAME=MobiWave Innovations
CANDYAI_DEFAULT_AI_PROVIDER=openai
CANDYAI_AI_BASE_URL=https://api.openai.com/v1
CANDYAI_AI_API_KEY=replace-with-a-secret
CANDYAI_AI_MODEL=replace-with-a-supported-model
```

For an OpenAI-compatible self-hosted provider, set `CANDYAI_AI_BASE_URL` to its HTTPS API base and configure its key/model as required. Do not enable autonomous replies for a live inbox until the knowledge-grounding, handoff, and failure paths have been tested.

## Required validation before deployment

Run from the repository root:

- Focused CandyAI specs: `bundle exec rspec spec/services/candy_ai spec/lib/candy_ai`
- Full backend suite or the repository's supported CI test target.
- Lint/security checks used by this Chatwoot revision.
- Database preparation against an empty database and migration against a disposable snapshot.
- Smoke test signup/login, account isolation, inbox creation, inbound message, human assignment, AI disabled, AI assist, autonomous response, human-request handoff, provider timeout, and worker restart.
- Verify SSRF rejection for loopback, RFC1918, link-local, IPv6-local, and redirect-to-private destinations.
- Confirm request logs do not contain API keys, prompts, customer messages, or provider response bodies.
- Confirm the web app and Sidekiq use the same PostgreSQL/Redis configuration and that backups can be restored.

## Deployment gate

Do not point a production domain at this branch until tests pass, migration/rollback steps are rehearsed, secrets are configured, HTTPS and SMTP are verified, and the owner explicitly approves the production cutover. Keep the legacy `main` branch and its deployment untouched during this work.
