Playwright tests for the landing experience

Install dependencies and Playwright browsers:

```bash
npm install
npm run playwright:install
```

Run tests (headless):

```bash
npm run playwright:test
```

Run tests (headed):

```bash
npm run playwright:test:headed
```

Notes:
- Tests assume the dev server is running at `http://localhost:8080` (Playwright `baseURL`).
- If Turnstile/CAPTCHA or demo limits block automated messaging, consider disabling those features or mocking the network endpoints in CI.
