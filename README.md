# faucet

OpcatLayer testnet faucet: web UI + REST API.

## Layout

- `web/` — React + Turnstile faucet page
- `api/` — Express API. Serves `POST /claim` and refills a UTXO pool in the background

## Run locally

```bash
cd api && cp .env.example .env   # fill in WIF, TURNSTILE_SECRET, etc.
npm install && npm run dev

cd ../web
npm install && npm run dev
```

Redis must be reachable at the configured `REDIS_HOST:REDIS_PORT`.

## Claiming from the API

`POST /claim` expects JSON `{ addr, captchaToken }`. The Cloudflare Turnstile
token is required for public traffic and verified server-side.

Return codes are documented at the top of `api/src/index.ts`.

## Dev-token bypass (internal automation only)

Internal tools (tester skills, CI jobs) that cannot solve a captcha may
present an `X-Dev-Token: <value>` header on `POST /claim`. A valid token
bypasses **both captcha verification and rate limits** and is not recorded
against per-address / per-IP counters.

Registered tokens live in the Redis SET `opcatlayer-faucet:dev-keys`.
Rotate them with:

```bash
redis-cli SADD opcatlayer-faucet:dev-keys <random-32-byte-hex>
redis-cli SREM opcatlayer-faucet:dev-keys <old-token>
```

Tokens are not loaded at server startup — membership is checked live on
each request, so revocation takes effect immediately without a restart.

Keep tokens out of source control; distribute them out-of-band (e.g. 1Password,
GitHub Secrets).
